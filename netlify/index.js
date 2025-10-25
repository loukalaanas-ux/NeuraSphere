// gemini/index.js (Netlify Function)
const { GoogleGenAI } = require("@google/genai");

// الحصول على المفتاح من متغيرات بيئة Netlify
// هذا المتغير سنقوم بتعيينه يدوياً لاحقاً في لوحة تحكم Netlify
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: "Missing GEMINI_API_KEY environment variable." }),
  };
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// الدالة الرئيسية لوظيفة Netlify
exports.handler = async (event, context) => {
  // ------------------------------------------
  // 1. استخراج المدخلات
  // ------------------------------------------
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const data = JSON.parse(event.body);
  const message = data.message;
  const learningLanguage = data.learningLanguage || "English";

  if (!message || message.length < 3) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "الرسالة يجب أن تحتوي على 3 أحرف على الأقل." }),
    };
  }

  // ------------------------------------------
  // 2. إعداد التعليمات لنموذج Gemini
  // ------------------------------------------
  const systemInstruction = `أنت مدرس لغة آلي متقدم ومحترف. 
    مهمتك هي مساعدة المستخدم على تعلم اللغة ${learningLanguage}.

    القواعد التي يجب أن تتبعها في كل رد:
    1. الرد يجب أن يكون بالكامل **باللغة ${learningLanguage}**.
    2. يجب أن تجيب على سؤال المستخدم أو تعلق على جملته.
    3. يجب أن تقدم **تصحيحاً أو اقتراحاً** لتحسين الجملة أو السؤال إذا كان المستخدم قد ارتكب خطأ نحوي أو لغوي، ضع التصحيح بخط **عريض**.
    4. اختم ردك **بسؤال مفتوح** متعلق بالموضوع لتشجيع المستخدم على المتابعة والممارسة.`;

  // ------------------------------------------
  // 3. طلب الرد من نموذج Gemini Flash
  // ------------------------------------------
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // ------------------------------------------
    // 4. إرجاع الرد
    // ------------------------------------------
    return {
      statusCode: 200,
      body: JSON.stringify({
        response: response.text,
        language: learningLanguage,
      }),
    };

  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "تعذر الاتصال بخدمة الذكاء الاصطناعي." }),
    };
  }
};