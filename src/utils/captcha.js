const fetch = require("node-fetch");

async function verifyCaptcha(token) {
  const res = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.GOOGLE_RECAPTCHA_SECRET}&response=${token}`
    }
  );

  const data = await res.json();
  console.log("Captcha verification response:", data);

  return [data.success == true ? true : false, data.success && data.score >= 0.5];
}

module.exports = { verifyCaptcha };