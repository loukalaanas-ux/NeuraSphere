// netlify/index.js - وظيفة Netlify التي تتصل بـ Gemini

const { GoogleGenAI } = require('@google/genai');

// تهيئة Gemini AI باستخدام مفتاح API المخزن كمتغير بيئة (Environment Variable)
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// اسم النموذج (Model) الذي سنستخدمه
const MODEL_NAME = "gemini-2.5-flash"; 

exports.handler = async (event) => {
    // يجب أن تكون الدالة POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { message, learningLanguage } = body;

        if (!message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing message parameter' }),
            };
        }

        // إعداد موجه (Prompt) لإخبار الذكاء الاصطناعي بدوره
        const prompt = `أنت معلم لغة إنجليزية خبير. مهمتك هي: 1. تصحيح جملة المستخدم. 2. الرد على المستخدم باللغة الإنجليزية في نفس سياق سؤاله. 3. ترجمة الرد الإنجليزي إلى اللغة العربية. لغة التعلم المطلوبة هي: ${learningLanguage}. سؤال المستخدم: "${message}"`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const botResponse = response.text.trim();
        
        // قد تحتاج إلى تحليل الرد للحصول على الرد العربي والإنجليزي (حسب تنسيق الرد من Gemini)
        // في هذا الكود، سنرسل الرد كاملاً (قد يتضمن الإنجليزي والعربي والتصحيح)

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                response: botResponse,
                language: 'English', // نعتبر لغة الرد هي لغة التعلم المطلوبة
            }),
        };

    } catch (error) {
        console.error("AI Function Error:", error);
        
        // رسالة خطأ للمستخدم للمساعدة في التشخيص
        const userError = (error.message && error.message.includes('API_KEY_INVALID')) ? 
            "خطأ: مفتاح Gemini API Key غير صالح أو مفقود. (تحقق من متغير البيئة)" :
            "حدث خطأ غير معروف في معالجة طلب الذكاء الاصطناعي.";

        return {
            statusCode: 500,
            body: JSON.stringify({ error: userError }),
        };
    }
};