import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Dapatkan path relatif file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baca JSON secara manual
const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "firebase-adminsdk.json"), "utf8")
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const sendFirebaseNotification = async (
    fcmToken,
    title,
    body,
    {
        targetUserId,   // ⬅️ WAJIB
        type = "promo", // opsional
        promoId = null  // opsional
    } = {}
) => {
    if (!fcmToken || !targetUserId) {
        console.log("⚠️ FCM Token atau targetUserId tidak tersedia");
        return;
    }

    try {
        const message = {
            token: fcmToken,

            // ❗ Notification tetap dikirim
            notification: {
                title,
                body,
            },

            // 🔑 DATA PAYLOAD → VALIDASI DI CLIENT
            data: {
                targetUserId: targetUserId.toString(),
                type,
                promoId: promoId ? promoId.toString() : "",
                timestamp: Date.now().toString()
            },

            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "promo_channel"
                }
            },

            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Notifikasi terkirim ke user ${targetUserId}:`, response);
        return response;

    } catch (err) {
        console.error("❌ Gagal mengirim notifikasi:", err.message);

        if (err.code === "messaging/registration-token-not-registered") {
            console.error("Token FCM tidak valid / expired");
        }

        throw err;
    }
};