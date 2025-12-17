const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/* -------------------- UTILITIES -------------------- */

// Helper to get current time in IST (UTC+5:30)
function getNowIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5.5);
}

// Helper to convert "YYYY-MM-DD HH:mm" (IST) -> Javascript Date (UTC)
function parseToUTC(dateStr, timeStr = "00:00") {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30, 0, 0));
}

function getISTDateString(dateObj) {
  return dateObj.toISOString().slice(0, 10); // Returns YYYY-MM-DD
}

function buildDedupKey({ userId, type, sourceId }) {
  // Key = User + Type + ID (e.g., "user123_task_taskID_due")
  return `${userId}_${type}_${sourceId}`;
}

// ⚡️ TRANSACTION-BASED CREATOR (Prevents Double Notifications)
async function createNotification(payload) {
  const { userId, type, sourceId, triggerAt, title, body } = payload;
  const dedupKey = buildDedupKey({ userId, type, sourceId });
  const ref = db.collection("notifications").doc(dedupKey);

  // Use Transaction to ensure we never create duplicates even if scheduler retries
  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    if (!doc.exists) {
      t.set(ref, {
        userId,
        type,
        sourceId,
        triggerAt,
        title: title || "Reminder",
        body: body || "You have a pending item.",
        dedupKey,
        sent: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`SCHEDULED: ${type} for ${userId} [${sourceId}]`);
    }
  });
}

/* -------------------- SCHEDULER: CREATE -------------------- */

exports.scheduleNotifications = functions.scheduler.onSchedule(
  "every 1 minutes",
  async () => {
    const nowUTC = new Date();
    const nowIST = getNowIST();
    const todayStr = getISTDateString(nowIST);

    // Lookahead for tasks/events
    const tomorrowIST = new Date(nowIST);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    const tomorrowStr = getISTDateString(tomorrowIST);

    console.log(`RUNNING. IST: ${nowIST.toISOString().slice(11, 19)}`);

    /* ================== 1. TASKS ================== */
    const tasksSnap = await db
      .collection("tasks")
      .where("status", "!=", "completed")
      .where("dueDate", "in", [todayStr, tomorrowStr])
      .get();

    for (const doc of tasksSnap.docs) {
      const t = doc.data();
      if (!t.userId || !t.dueDate) continue;

      const triggerTime = parseToUTC(t.dueDate, t.dueTime);
      const diffMs = triggerTime.getTime() - nowUTC.getTime();
      const diffMins = diffMs / 60000;

      // A. Exact Time (Trigger if due in next 60m OR passed in last 5m)
      if (diffMins > -5 && diffMins < 60) {
        const fireTime = diffMs < 0 ? nowUTC : triggerTime;
        await createNotification({
          userId: t.userId,
          type: "task",
          sourceId: `${doc.id}_due`,
          triggerAt: admin.firestore.Timestamp.fromDate(fireTime),
          title: `Task Due: ${t.title}`,
          body: `Your task "${t.title}" is due now.`,
        });
      }

      // B. 30 Minutes Before
      const warnTime = new Date(triggerTime.getTime() - 30 * 60000);
      const warnDiff = warnTime.getTime() - nowUTC.getTime();

      if (warnDiff > -5 * 60000 && warnDiff < 60 * 60000) {
        const fireTime = warnDiff < 0 ? nowUTC : warnTime;
        await createNotification({
          userId: t.userId,
          type: "task",
          sourceId: `${doc.id}_30m`,
          triggerAt: admin.firestore.Timestamp.fromDate(fireTime),
          title: `Upcoming Task: ${t.title}`,
          body: `30 minutes remaining for "${t.title}"`,
        });
      }
    }

    /* ================== 2. EVENTS ================== */
    const eventsSnap = await db.collection("events").get();

    for (const doc of eventsSnap.docs) {
      const e = doc.data();
      if (!e.userId || !e.date) continue;

      // Handle Recurring
      let targetDateStr = e.date;
      if (e.recurring === "yearly") {
        const eventMonthDay = e.date.slice(5); // "MM-DD"
        const todayMonthDay = todayStr.slice(5);
        if (eventMonthDay === todayMonthDay) {
          targetDateStr = todayStr;
        } else {
          continue;
        }
      } else if (e.date !== todayStr && e.date !== tomorrowStr) {
        continue;
      }

      const triggerTime = parseToUTC(targetDateStr, e.time || "09:00");
      
      // --- EVENT GRACE PERIOD LOGIC ---
      const diffMs = triggerTime.getTime() - nowUTC.getTime();
      const diffMins = diffMs / 60000;

      // 1. Event Start Time (Includes Grace Period)
      if (diffMins > -5 && diffMins < 60) {
        const fireTime = diffMs < 0 ? nowUTC : triggerTime;
        await createNotification({
          userId: e.userId,
          type: "event",
          sourceId: `${doc.id}_${targetDateStr}`,
          triggerAt: admin.firestore.Timestamp.fromDate(fireTime),
          title: `Event: ${e.title}`,
          body: `Happening at ${e.time || "09:00"}`,
        });
      }

      // 2. 30 Mins Before
      const warnTime = new Date(triggerTime.getTime() - 30 * 60000);
      const warnDiff = warnTime.getTime() - nowUTC.getTime();
      
      if (warnDiff > -5 * 60000 && warnDiff < 60 * 60000) {
        const fireTime = warnDiff < 0 ? nowUTC : warnTime;
        await createNotification({
          userId: e.userId,
          type: "event",
          sourceId: `${doc.id}_${targetDateStr}_30m`,
          triggerAt: admin.firestore.Timestamp.fromDate(fireTime),
          title: `Upcoming Event: ${e.title}`,
          body: `Starting in 30 minutes.`,
        });
      }
    }

    /* ================== 3. JOURNAL ================== */
    const settingsSnap = await db.collection("settings").get();

    for (const s of settingsSnap.docs) {
      const st = s.data();
      if (!st.userId || !st.journalReminderTime) continue;

      const reminderTime = parseToUTC(todayStr, st.journalReminderTime);

      // Trigger if we are currently PAST the reminder time
      if (nowUTC >= reminderTime) {
        
        // 1. Check if user already wrote the journal TODAY
        const journalSnap = await db.collection("journals")
          .where("userId", "==", st.userId)
          .where("date", "==", todayStr)
          .limit(1)
          .get();

        if (journalSnap.empty) {
          // 2. Create notification (Transaction will prevent duplicates)
          await createNotification({
            userId: st.userId,
            type: "journal",
            sourceId: `journal_${todayStr}`,
            triggerAt: admin.firestore.Timestamp.fromDate(nowUTC),
            title: "Journal Reminder",
            body: "How was your day? Take a moment to write about it.",
          });
        }
      }
    }

    return null;
  }
);

/* -------------------- SCHEDULER: SEND -------------------- */

exports.sendPendingNotifications = functions.scheduler.onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

    const pendingSnap = await db
      .collection("notifications")
      .where("sent", "==", false)
      .where("triggerAt", "<=", now)
      .limit(50)
      .get();

    if (pendingSnap.empty) return null;

    const updates = [];

    for (const nDoc of pendingSnap.docs) {
      const notif = nDoc.data();

      // Get tokens
      const tokensSnap = await db.collection("fcmTokens")
        .where("userId", "==", notif.userId)
        .get();

      if (tokensSnap.empty) {
        updates.push(nDoc.ref.update({ sent: true, note: "No tokens" }));
        continue;
      }

      const tokens = tokensSnap.docs.map((t) => t.data().token);

      const message = {
        notification: {
          title: notif.title,
          body: notif.body,
        },
        data: {
             // ⚡️ FIX: Ensure clicking opens the NEW site
             url: 'https://arteccosmriti.netlify.app' 
        },
        tokens: tokens,
      };

      const sendPromise = (async () => {
        try {
          const response = await messaging.sendEachForMulticast(message);

          // Cleanup invalid tokens
          const cleanupPromises = [];
          response.responses.forEach((res, idx) => {
            if (!res.success) {
              const err = res.error;
              if (
                err.code === "messaging/invalid-registration-token" ||
                err.code === "messaging/registration-token-not-registered"
              ) {
                cleanupPromises.push(tokensSnap.docs[idx].ref.delete());
              }
            }
          });

          await Promise.all(cleanupPromises);
          await nDoc.ref.update({ sent: true, successCount: response.successCount });
        } catch (e) {
          console.error("FCM Send Error", e);
          await nDoc.ref.update({ sent: true, error: e.message });
        }
      })();

      updates.push(sendPromise);
    }

    await Promise.all(updates);
    console.log(`Processed ${pendingSnap.size} notifications.`);
    return null;
  }
);

/* -------------------- CLEANUP -------------------- */

exports.cleanupNotifications = functions.scheduler.onSchedule(
  "every day 03:00",
  async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    );
    const oldSnap = await db.collection("notifications").where("createdAt", "<", cutoff).limit(500).get();
    const batch = db.batch();
    oldSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return null;
  }
);