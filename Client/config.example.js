/***** CONFIGURATION *****/
// Copy this file to config.js and update with your AWS resources

const CONFIG = {
    // AWS Configuration
    REGION: "us-east-1",
    BUCKET: "your-voicenav-bucket",
    PREFIX: "audio-store/",
    WS_URL: "wss://your-api-id.execute-api.us-east-1.amazonaws.com/production",

    // Voice Recording Settings
    RECORDING_FORMAT: "audio/webm",
    MAX_RECORDING_TIME: 30000, // 30 seconds

    // UI Settings
    SHOW_DEBUG_LOG: true,
    AUTO_RECONNECT: true,
    RECONNECT_DELAY: 1000 // 1 second
};

// Export for use in app.js
if (typeof module !== "undefined" && module.exports) {
    module.exports = CONFIG;
}
