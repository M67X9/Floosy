// Copied from the Floosy prototype (Main.dc.html).
export type Lang = 'en' | 'ar';

export type CatId = 'food' | 'ent' | 'subs' | 'loan' | 'fuel' | 'shop' | 'trans' | 'bills' | 'health' | 'other';

export type Cat = { id: CatId; en: string; ar: string; sEn: string; sAr: string; color: string };
export const CATS: Cat[] = [
  { id: 'food', en: 'Food & Drinks', ar: 'طعام ومشروبات', sEn: 'Food', sAr: 'طعام', color: '#E0722A' },
  { id: 'ent', en: 'Entertainment', ar: 'ترفيه', sEn: 'Fun', sAr: 'ترفيه', color: '#8B5CF6' },
  { id: 'subs', en: 'Subscriptions', ar: 'اشتراكات', sEn: 'Subs', sAr: 'اشتراكات', color: '#2F6FEB' },
  { id: 'loan', en: 'Loan', ar: 'قرض', sEn: 'Loan', sAr: 'قرض', color: '#5B6B80' },
  { id: 'fuel', en: 'Gas / Fuel', ar: 'بنزين', sEn: 'Fuel', sAr: 'بنزين', color: '#C08A00' },
  { id: 'shop', en: 'Shopping', ar: 'تسوق', sEn: 'Shopping', sAr: 'تسوق', color: '#D9408A' },
  { id: 'trans', en: 'Transportation', ar: 'مواصلات', sEn: 'Transport', sAr: 'مواصلات', color: '#0E9F8E' },
  { id: 'bills', en: 'Bills & Utilities', ar: 'فواتير وخدمات', sEn: 'Bills', sAr: 'فواتير', color: '#8A5A33' },
  { id: 'health', en: 'Health', ar: 'صحة', sEn: 'Health', sAr: 'صحة', color: '#D94141' },
  { id: 'other', en: 'Other', ar: 'أخرى', sEn: 'Other', sAr: 'أخرى', color: '#7D8A86' }
];

export const SUGG: { en: string; ar: string; cat: CatId }[] = [
  { en: 'Lunch', ar: 'غداء', cat: 'food' }, { en: 'Groceries', ar: 'مقاضي', cat: 'food' }, { en: 'Coffee', ar: 'قهوة', cat: 'food' },
  { en: 'Fuel', ar: 'بنزين', cat: 'fuel' }, { en: 'Car wash', ar: 'غسيل السيارة', cat: 'trans' }, { en: 'Netflix', ar: 'نتفليكس', cat: 'subs' }
];

const en = {
gMorning: 'Good morning,', gAfternoon: 'Good afternoon,', gEvening: 'Good evening,', user: 'Noura', profile: 'Profile and settings', profileSub: 'Personal account',
vsSame: 'vs same days last month', today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow', thisWeek: 'This week', thisMonth: 'This month', avgDay: 'Avg. per day',
breakdown: 'Spending breakdown', period: 'Period', week: 'Week', month: 'Month', year: 'Year', total: 'Total spent', noSpendPeriod: 'No spending in this period yet.',
budget: 'Monthly budget', recent: 'Recent', seeAll: 'See all',
home: 'Home', txShort: 'History', mainNav: 'Main', addTitle: 'Add expense', editTitle: 'Edit expense', amount: 'Amount', desc: 'Description (optional)', descPh: 'What did you spend on?',
date: 'Date', category: 'Category', save: 'Save expense', saveChanges: 'Save changes', amountErr: 'Enter an amount greater than 0.000', close: 'Close', prevMonth: 'Previous month', nextMonth: 'Next month',
toastAdded: 'Expense added', toastSaved: 'Changes saved', toastDeleted: 'Expense deleted',
txTitle: 'Transactions', searchPh: 'Search expenses', filters: 'Filters', sortBy: 'Sort by', sortNew: 'Newest', sortOld: 'Oldest', sortHigh: 'Highest', all: 'All', allTime: 'All time', last7: 'Last 7 days', lastMonth: 'Last month', custom: 'Custom', from: 'From', to: 'To', clear: 'Clear search', dateRange: 'Date range', resetFilters: 'Clear filters', highestFirst: 'Highest first',
expenses: 'expenses', emptyTitle: 'No expenses found', emptyBody: 'Try a different search, or clear your filters to see everything.', showMore: 'Show more', details: 'Expense details', edit: 'Edit', delete: 'Delete', confirmDel: 'Delete this expense?', confirmBody: "This can't be undone.", cancel: 'Cancel', noDesc: 'No description',
insTitle: 'Insights', insSub: 'Your spending, at a glance', trend: 'Weekly spending', last12: 'Last 12 weeks', avgWeek: 'avg. per week', monthly: 'Month by month', soFar: 'so far', highest: 'Biggest expense this month', top: 'Top categories', last30: 'Last 30 days', nothingYet: 'Nothing yet',
budgetTitle: 'Budget', spent: 'Spent', remaining: 'Left to spend', overBy: 'Over budget by', catBudgets: 'Category budgets', onTrack: 'On track', near: 'Close to limit', over: 'Over budget', adjust: 'Tap to adjust by 25 KD', decrease: 'Decrease budget', increase: 'Increase budget', back: 'Back', pace: 'Where you should be today', paceNote: 'The white tick shows where your spending should be by today.',
setTitle: 'Settings', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark', currency: 'Currency', kwd: 'Kuwaiti Dinar (KD)', tagline: 'Your money, made simple.', version: 'Prototype · v0.1',
obTitle: 'Welcome to Floosy', obBody: 'Your money, made simple. Two quick details and you’re ready to start tracking.', obName: 'What should we call you?', obNamePh: 'Your name', obNameErr: 'Please enter your name.', obIncome: 'Monthly income', obIncomeHelp: 'Used to show how much of your income you spend each month.', obIncomeErr: 'Enter your monthly income, for example 1,200.000', obStart: 'Get started', obNote: 'Saved to your account. You can change it anytime in Settings.', income: 'Monthly income', editProfile: 'Edit name & income', friend: 'there',
resetRow: 'Reset app', resetSub: 'Erase everything and start fresh', resetTitle: 'Reset Floosy?', resetBody: 'This permanently deletes your name, income, expenses and budgets, including the expenses saved online. This can’t be undone.', resetConfirm: 'Erase everything', toastReset: 'Floosy was reset', toastError: 'Couldn’t reach the database. Try again.',
invoice: 'Invoice photo (optional)', invoiceTitle: 'Invoice', takePhoto: 'Take photo', choosePhoto: 'Choose photo', changePhoto: 'Change', removePhoto: 'Remove', invoiceErr: 'Couldn’t upload the photo. Check your connection and try again.', cameraDenied: 'Allow camera access in your phone’s settings to take a photo.', photoLoadErr: 'Couldn’t load the photo.', hasInvoice: 'Has an invoice photo', autofill: 'Autofill from the invoice', autofilling: 'Reading the invoice…', autofillDone: 'Filled in from the invoice. Please check the details.', autofillNone: 'Couldn’t find any details on this invoice. Fill them in by hand.', autofillErr: 'Couldn’t read the invoice right now. Try again or fill it in by hand.',
authInTitle: 'Welcome back', authInBody: 'Sign in to see your expenses, on any device.', authUpTitle: 'Create your account', authUpBody: 'Register with your email. Your expenses stay private to you.',
authEmail: 'Email', authPassword: 'Password', authConfirm: 'Confirm password', authPassHint: 'Create a password', authSignIn: 'Sign in', authSignUp: 'Create account',
authToSignUp: 'New here? Create an account', authToSignIn: 'Already have an account? Sign in', authBackToSignIn: 'Back to sign in',
authEmailErr: 'Enter a valid email address.', authPassErr: 'Use 8 or more characters with a lowercase letter, an uppercase letter and a number.', authRuleLen: '8 or more characters', authRuleLower: 'A lowercase letter (a-z)', authRuleUpper: 'An uppercase letter (A-Z)', authRuleDigit: 'A number (0-9)', authPassEmpty: 'Enter your password.', authMatchErr: 'The passwords don’t match.',
authInvalid: 'Wrong email or password.', authExists: 'This email is already registered. Try signing in.', authUnconfirmed: 'Confirm your email first. Open the link we sent you.',
authRate: 'Too many attempts. Wait a minute and try again.', authNetwork: 'Couldn’t reach the server. Check your connection.', authOther: 'Something went wrong. Please try again.',
authCheckTitle: 'Check your email', authCheckBody: 'We sent a confirmation link to this address. Open it, then come back and sign in.',
signOut: 'Sign out', signOutSub: 'You can sign back in anytime', account: 'Account'
};

export type Strings = typeof en;

const ar: Strings = {
gMorning: 'صباح الخير،', gAfternoon: 'مساء الخير،', gEvening: 'مساء الخير،', user: 'نورة', profile: 'الملف الشخصي والإعدادات', profileSub: 'حساب شخصي',
vsSame: 'مقارنة بنفس الأيام من الشهر الماضي', today: 'اليوم', yesterday: 'أمس', tomorrow: 'غداً', thisWeek: 'هذا الأسبوع', thisMonth: 'هذا الشهر', avgDay: 'المعدل اليومي',
breakdown: 'توزيع المصروفات', period: 'الفترة', week: 'أسبوع', month: 'شهر', year: 'سنة', total: 'إجمالي المصروف', noSpendPeriod: 'لا توجد مصروفات في هذه الفترة بعد.',
budget: 'الميزانية الشهرية', recent: 'آخر المصروفات', seeAll: 'عرض الكل',
home: 'الرئيسية', txShort: 'السجل', mainNav: 'التنقل الرئيسي', addTitle: 'إضافة مصروف', editTitle: 'تعديل المصروف', amount: 'المبلغ', desc: 'الوصف (اختياري)', descPh: 'على ماذا صرفت؟',
date: 'التاريخ', category: 'الفئة', save: 'حفظ المصروف', saveChanges: 'حفظ التغييرات', amountErr: 'أدخل مبلغاً أكبر من 0.000', close: 'إغلاق', prevMonth: 'الشهر السابق', nextMonth: 'الشهر التالي',
toastAdded: 'تمت إضافة المصروف', toastSaved: 'تم حفظ التغييرات', toastDeleted: 'تم حذف المصروف',
txTitle: 'المعاملات', searchPh: 'ابحث في المصروفات', filters: 'التصفية', sortBy: 'الترتيب', sortNew: 'الأحدث', sortOld: 'الأقدم', sortHigh: 'الأعلى', all: 'الكل', allTime: 'كل الفترات', last7: 'آخر 7 أيام', lastMonth: 'الشهر الماضي', custom: 'مخصص', from: 'من', to: 'إلى', clear: 'مسح البحث', dateRange: 'الفترة الزمنية', resetFilters: 'مسح التصفية', highestFirst: 'الأعلى أولاً',
expenses: 'عملية', emptyTitle: 'لا توجد مصروفات', emptyBody: 'جرّب بحثاً مختلفاً، أو امسح التصفية لعرض كل شيء.', showMore: 'عرض المزيد', details: 'تفاصيل المصروف', edit: 'تعديل', delete: 'حذف', confirmDel: 'حذف هذا المصروف؟', confirmBody: 'لا يمكن التراجع عن ذلك.', cancel: 'إلغاء', noDesc: 'بدون وصف',
insTitle: 'التحليلات', insSub: 'مصروفاتك بنظرة سريعة', trend: 'المصروف الأسبوعي', last12: 'آخر 12 أسبوعاً', avgWeek: 'المعدل الأسبوعي', monthly: 'شهراً بشهر', soFar: 'حتى الآن', highest: 'أكبر مصروف هذا الشهر', top: 'أعلى الفئات', last30: 'آخر 30 يوماً', nothingYet: 'لا شيء بعد',
budgetTitle: 'الميزانية', spent: 'المصروف', remaining: 'المتبقي للصرف', overBy: 'تجاوزت الميزانية بـ', catBudgets: 'ميزانيات الفئات', onTrack: 'ضمن الخطة', near: 'قريب من الحد', over: 'تجاوز الميزانية', adjust: 'اضغط للتعديل بمقدار 25 د.ك', decrease: 'تقليل الميزانية', increase: 'زيادة الميزانية', back: 'رجوع', pace: 'أين يجب أن تكون اليوم', paceNote: 'العلامة البيضاء توضح المصروف المتوقع حتى اليوم.',
setTitle: 'الإعدادات', language: 'اللغة', appearance: 'المظهر', light: 'فاتح', dark: 'داكن', currency: 'العملة', kwd: 'دينار كويتي (د.ك)', tagline: 'فلوسك، ببساطة.', version: 'نموذج أولي · الإصدار 0.1',
obTitle: 'أهلاً بك في فلوسي', obBody: 'فلوسك، ببساطة. معلومتان سريعتان وتبدأ بتتبع مصروفاتك.', obName: 'ما اسمك؟', obNamePh: 'اسمك', obNameErr: 'يرجى إدخال اسمك.', obIncome: 'الدخل الشهري', obIncomeHelp: 'نستخدمه لنوضح لك نسبة ما تصرفه من دخلك كل شهر.', obIncomeErr: 'أدخل دخلك الشهري، مثلاً 1,200.000', obStart: 'ابدأ الآن', obNote: 'يُحفظ في حسابك، ويمكنك تعديله في أي وقت من الإعدادات.', income: 'الدخل الشهري', editProfile: 'تعديل الاسم والدخل', friend: 'صديقي',
resetRow: 'إعادة ضبط التطبيق', resetSub: 'احذف كل شيء وابدأ من جديد', resetTitle: 'إعادة ضبط فلوسي؟', resetBody: 'سيتم حذف اسمك ودخلك ومصروفاتك وميزانياتك نهائياً، بما فيها المصروفات المحفوظة على الإنترنت. لا يمكن التراجع عن ذلك.', resetConfirm: 'حذف كل شيء', toastReset: 'تمت إعادة ضبط فلوسي', toastError: 'تعذر الاتصال بقاعدة البيانات. حاول مرة أخرى.',
invoice: 'صورة الفاتورة (اختياري)', invoiceTitle: 'الفاتورة', takePhoto: 'التقاط صورة', choosePhoto: 'اختيار صورة', changePhoto: 'تغيير', removePhoto: 'إزالة', invoiceErr: 'تعذر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى.', cameraDenied: 'اسمح بالوصول إلى الكاميرا من إعدادات هاتفك لالتقاط صورة.', photoLoadErr: 'تعذر تحميل الصورة.', hasInvoice: 'يوجد صورة فاتورة', autofill: 'تعبئة تلقائية من الفاتورة', autofilling: 'جارٍ قراءة الفاتورة…', autofillDone: 'تمت التعبئة من الفاتورة. يرجى التحقق من التفاصيل.', autofillNone: 'لم نجد أي تفاصيل في هذه الفاتورة. املأها يدويًا.', autofillErr: 'تعذرت قراءة الفاتورة الآن. حاول مرة أخرى أو املأ التفاصيل يدويًا.',
authInTitle: 'أهلاً بعودتك', authInBody: 'سجّل دخولك لترى مصروفاتك على أي جهاز.', authUpTitle: 'أنشئ حسابك', authUpBody: 'سجّل ببريدك الإلكتروني. مصروفاتك تبقى خاصة بك.',
authEmail: 'البريد الإلكتروني', authPassword: 'كلمة المرور', authConfirm: 'تأكيد كلمة المرور', authPassHint: 'أنشئ كلمة مرور', authSignIn: 'تسجيل الدخول', authSignUp: 'إنشاء حساب',
authToSignUp: 'جديد هنا؟ أنشئ حسابًا', authToSignIn: 'لديك حساب؟ سجّل الدخول', authBackToSignIn: 'العودة لتسجيل الدخول',
authEmailErr: 'أدخل بريدًا إلكترونيًا صحيحًا.', authPassErr: 'استخدم 8 أحرف أو أكثر مع حرف إنجليزي صغير وحرف إنجليزي كبير ورقم.', authRuleLen: '8 أحرف أو أكثر', authRuleLower: 'حرف إنجليزي صغير (a-z)', authRuleUpper: 'حرف إنجليزي كبير (A-Z)', authRuleDigit: 'رقم (0-9)', authPassEmpty: 'أدخل كلمة المرور.', authMatchErr: 'كلمتا المرور غير متطابقتين.',
authInvalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', authExists: 'هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.', authUnconfirmed: 'أكّد بريدك الإلكتروني أولًا. افتح الرابط الذي أرسلناه لك.',
authRate: 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.', authNetwork: 'تعذر الاتصال بالخادم. تحقق من اتصالك.', authOther: 'حدث خطأ ما. حاول مرة أخرى.',
authCheckTitle: 'تحقق من بريدك', authCheckBody: 'أرسلنا رابط التأكيد إلى هذا العنوان. افتحه ثم عد وسجّل الدخول.',
signOut: 'تسجيل الخروج', signOutSub: 'يمكنك تسجيل الدخول مرة أخرى في أي وقت', account: 'الحساب'
};

export const T: Record<Lang, Strings> = { en, ar };
