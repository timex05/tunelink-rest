const { createTransport } = require('nodemailer');

const transport = createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_ADRESS,
    pass: process.env.MAIL_APP_PASSWORD
  }
});

async function sendMail({ to, subject, html }) {
  try {
    const result = await transport.sendMail({ to, subject: `[${process.env.APP_NAME}]${subject}`, html });
    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
}

async function sendMailAws(mailData){
  const maildata = {
    address: "",
    template: "",
    values: {
      url: ""
    }
  }
}

module.exports = { sendMail }