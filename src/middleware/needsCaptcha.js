const { verifyCaptcha } = require("../utils/captcha");

const needsCaptcha = async (req, res, next) => {
    try {
        let { captchaToken } = req.body;
        captchaToken = captchaToken || req.query.captchaToken;
        if (!captchaToken) {
            console.log("Captcha Token Missing");
            next();
            return;
            // return res.status(400).json({ error: "Captcha token missing." });
        }
        const [success, valid] = await verifyCaptcha(captchaToken);
        if(!success){
          return res.status(500).json({ error: "Captcha verification error." });
        }
        if (!valid) {
          return res.status(403).json({ error: "Captcha failed" });
        }
        next();
    } catch (error) {
        console.error("Captcha verification error:", error);
        res.status(500).json({ error: "Internal Error." });
    }
}

module.exports = needsCaptcha;