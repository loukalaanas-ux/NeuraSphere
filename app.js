/* Basic SPA + bilingual toggle + real Firebase Auth & Firestore.
 * تم تعديل الاتصال بالذكاء الاصطناعي لاستخدام Netlify Functions بدلاً من Firebase Functions.
*/

// =========================================================
// 1. FIREBASE CONFIGURATION (الآن نستخدمها فقط للمصادقة وقاعدة البيانات)
// =========================================================
const firebaseConfig = {
    // المفتاح الصحيح الذي تم التأكد منه: AIzaSyCxS-Z-EdBOdU7xalvMJZwtgy9G2b8p0cc
    apiKey: "AIzaSyCxS-Z-EdBOdU7xalvMJZwtgy9G2b8p0cc", 
    authDomain: "neruraspher.firebaseapp.com", 
    projectId: "neruraspher",
};

// Initialize Firebase services
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();    // لخدمة المصادقة (Authentication)
const db = app.firestore(); // لخدمة قاعدة البيانات (Firestore Database)

// **تم حذف تهيئة Firebase Functions لأننا سنستخدم Netlify**
// const functions = app.functions(); 

// دالة مساعدة لإنشاء رسالة HTML (مأخوذة من الكود القديم)
function createMessageElement(text, who='bot') {
    const msg = document.createElement('div');
    msg.className = 'message ' + (who === 'user' ? 'msg-user' : 'msg-bot');
    msg.textContent = text;
    return msg;
}

// دالة مساعدة لعرض رد البوت بشكل مباشر
function displayBotResponse(text, lang) {
    const chatLog = document.getElementById('chatLog');
    const msg = createMessageElement(text, 'bot');
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
}


document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const pages = Array.from(document.querySelectorAll('.page'));
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    const langBtn = document.getElementById('langToggle');
    const yearEl = document.getElementById('year');
    const chatForm = document.getElementById('chatForm');
    const chatLog = document.getElementById('chatLog');
    const chatInput = document.getElementById('chatInput');
    const signupForm = document.getElementById('signupForm');
    
    // init
    yearEl.textContent = new Date().getFullYear();
    const defaultLang = localStorage.getItem('ns_lang') || 'en';
    setLanguage(defaultLang);

    function setLanguage(lang){
        const html = document.documentElement;
        // set dir
        if(lang === 'ar'){ html.setAttribute('dir','rtl'); html.lang = 'ar'; }
        else { html.setAttribute('dir','ltr'); html.lang = 'en'; }

        // show/hide elements by data-lang
        document.querySelectorAll('[data-lang]').forEach(el => {
            el.style.display = (el.getAttribute('data-lang') === lang) ? '' : 'none';
        });

        // placeholder switch
        if(chatInput){
            chatInput.placeholder = lang === 'ar' ? chatInput.dataset.placeholderAr || chatInput.getAttribute('data-placeholder-ar') || 'اكتب سؤالاً' : chatInput.dataset.placeholderEn || chatInput.getAttribute('data-placeholder-en') || 'Type a question';
        }

        langBtn.textContent = (lang === 'ar') ? 'English' : 'العربية';
        localStorage.setItem('ns_lang', lang);
    }

    // Toggle language on button
    langBtn.addEventListener('click', () => {
        const current = document.documentElement.lang.startsWith('ar') ? 'ar' : 'en';
        const next = current === 'ar' ? 'en' : 'ar';
        setLanguage(next);
    });

    // Navigation (SPA)
    function showPage(id){
        pages.forEach(p => p.classList.toggle('active', p.id === id));
        window.scrollTo({top:0,behavior:'smooth'});
    }
    navLinks.forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget.dataset.target;
        if(target) showPage(target);
    }));

    // =========================================================
    // 3. CHAT LOGIC (الاتصال بـ Netlify Function)
    // =========================================================
    async function sendMessageToGemini(message, language) {
        
        // إنشاء رسالة التحميل (Loading message)
        const loadingMessageElement = createMessageElement('...');
        chatLog.appendChild(loadingMessageElement);
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
            // --- الاتصال بوظيفة Netlify الجديدة (الرابط الصحيح) ---
            // *لقد قمنا بإزالة النقطة من الرابط (/.netlify/functions/index)
            const response = await fetch('/netlify/functions/index', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    learningLanguage: language
                })
            });

            const data = await response.json();

            // إزالة رسالة التحميل
            chatLog.removeChild(loadingMessageElement);

            // التحقق من وجود خطأ في الرد
            if (response.status !== 200 || data.error) {
                const errorMessage = data.error || "حدث خطأ غير معروف في الاتصال بالخادم. (قد يكون خطأ في مفتاح Gemini API Key)";
                displayBotResponse(errorMessage, 'Arabic'); 
                return;
            }

            // عرض الرد الناجح
            displayBotResponse(data.response, data.language);

        } catch (error) {
            console.error("Fetch Error:", error);
            // إزالة رسالة التحميل في حالة وجود خطأ
            if (loadingMessageElement.parentNode) {
                chatLog.removeChild(loadingMessageElement);
            }
            displayBotResponse("تعذر الاتصال بخادم الذكاء الاصطناعي.", 'Arabic');
        }
    }

    // معالج حدث الإرسال (Submit handler)
    if(chatForm){
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if(!text) return;
            
            const lang = document.documentElement.lang.startsWith('ar') ? 'ar' : 'en';

            // 1. عرض رسالة المستخدم
            const userMessageElement = createMessageElement(text, 'user');
            chatLog.appendChild(userMessageElement);
            chatInput.value = '';
            
            // 2. منع الإرسال وتحديد اللغة
            chatInput.disabled = true; 
            const learningLang = 'English'; // لغة التعلم الثابتة حالياً 

            // 3. إرسال الرسالة إلى وظيفة Netlify
            await sendMessageToGemini(text, learningLang);

            chatInput.disabled = false; // تفعيل الإدخال مرة أخرى
        });
    }


    // =========================================================
    // 4. نظام التسجيل الحقيقي (باستخدام Firebase Auth & Firestore)
    // =========================================================
    if(signupForm){
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. جمع البيانات من النموذج
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());
            
            // ملاحظة: لا يوجد حقل لكلمة مرور في HTML، لذا نستخدم كلمة مرور افتراضية
            const email = data.email;
            const password = 'DefaultPassword123456'; // يجب أن تكون 6 أحرف على الأقل
            const lang = document.documentElement.lang.startsWith('ar') ? 'ar' : 'en';

            // 2. إنشاء حساب في نظام المصادقة (Authentication)
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    const uid = user.uid; // معرف المستخدم الفريد
                    
                    // 3. حفظ بيانات الملف الشخصي في قاعدة بيانات Firestore
                    return db.collection('users').doc(uid).set({
                        fullname: data.fullname,
                        nativeLanguage: data.native,
                        learningLanguage: data.learning,
                        email: email,
                        createdAt: new Date()
                    });
                })
                .then(() => {
                    // رسالة نجاح بعد إتمام الحفظ في Firestore
                    alert(lang === 'ar' ? '✅ تم إنشاء حسابك وحفظ بياناتك بنجاح! تحقق من Firebase.' : '✅ Account created and data successfully saved! Check Firebase.');
                    signupForm.reset();
                })
                .catch((error) => {
                    // معالجة الأخطاء
                    let errorMessage = error.message;
                    if(error.code === 'auth/email-already-in-use') {
                        errorMessage = lang === 'ar' ? 'هذا البريد الإلكتروني مستخدم بالفعل.' : 'This email is already in use.';
                    } else if(error.code === 'auth/invalid-email') {
                        errorMessage = lang === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email format.';
                    } else if (error.code === 'auth/api-key-not-valid') {
                            errorMessage = lang === 'ar' ? 'خطأ حرج: المفتاح غير صالح (تحقق من تفعيل المصادقة).' : 'Critical Error: API key is invalid (check auth activation).';
                        }
                    alert(lang === 'ar' ? `⚠️ خطأ في التسجيل: ${errorMessage}` : `⚠️ Signup Error: ${errorMessage}`);
                });
        });
    }


    // Contact form (demo)
    const contactForm = document.getElementById('contactForm');
    if(contactForm){
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert(document.documentElement.lang.startsWith('ar') ? 'شكرًا — تم استقبال رسالتك (تجريبي).' : 'Thanks — your message was received (demo).');
            contactForm.reset();
        });
    }

    // On load, navigate to home
    showPage('home');
});