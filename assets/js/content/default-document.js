/* ═══════════════════════════════════════════════
   default-document.js — Starter document shown on
   first load and after "Clear".

   Showcases every feature the editor supports, in
   a logical reading order:
     writing → structure → diagrams → data → media
     → math → code → layout → export
   ═══════════════════════════════════════════════ */

const DEFAULT_CONTENT = `# ✦ مرحباً بك في محرّر Markdown

> محرّر متكامل يعمل بالكامل في المتصفح: **مخططات Mermaid**، **رسوم Plotly التفاعلية**، **معادلات LaTeX**، **أكواد قابلة للتشغيل**، **خرائط تفاعلية**، **Callouts**، **Tabs**، **Grid Layout**، و**تصدير Word/PDF/PPTX**.

---

## 🎨 1. التنبيهات (Callouts)

استخدم \`:::type\` لإبراز المعلومات. الأنواع المدعومة: \`note\` \`info\` \`tip\` \`success\` \`warning\` \`danger\` \`error\` \`quote\`.

:::note
هذه ملاحظة جانبية. تدعم **العريض**، *المائل*، \`الكود السطري\`، والروابط.
:::

:::tip
استخدم **Ctrl+S** للحفظ السريع.
:::

:::warning عنوان مخصص
يمكن إضافة عنوان مخصص بعد النوع. التحذير يدعم القوائم أيضاً:

- عنصر أول
- عنصر ثانٍ
- عنصر ثالث
:::

:::danger
هذا الإجراء لا يمكن التراجع عنه! مثال على كود خطير:

\`\`\`bash
rm -rf / --no-preserve-root
\`\`\`
:::

:::success
✅ تم نشر التحديث بنجاح على خوادم الإنتاج.
:::

:::info
يستخدم المحرّر **marked** للتحليل، **highlight.js** للتلوين، **MathJax** للمعادلات، و**docx** لتصدير Word.
:::

:::quote
"الكود الجيد يشرح نفسه. الكود الممتاز لا يحتاج شرحاً." — Anonymous
:::

---

## 🗂️ 2. التبويبات (Tabs)

اعرض نفس المحتوى بصيغ متعددة دون تكرار.

=== "JavaScript"
    \`\`\`js
    // تسلسل فيبوناتشي
    const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2));

    const result = Array.from({ length: 10 }, (_, i) => fib(i));
    console.log("Fibonacci:", result.join(", "));
    \`\`\`

=== "Python"
    \`\`\`python
    def fibonacci(n: int) -> list[int]:
        seq = [0, 1]
        while len(seq) < n:
            seq.append(seq[-1] + seq[-2])
        return seq[:n]

    print(fibonacci(10))
    \`\`\`

=== "Rust"
    \`\`\`rust
    fn fibonacci(n: u32) -> u32 {
        match n {
            0 | 1 => n,
            _ => fibonacci(n - 1) + fibonacci(n - 2),
        }
    }

    fn main() {
        for i in 0..10 { print!("{} ", fibonacci(i)); }
    }
    \`\`\`

=== "Go"
    \`\`\`go
    package main

    import "fmt"

    func fib(n int) int {
        if n <= 1 { return n }
        return fib(n-1) + fib(n-2)
    }

    func main() {
        for i := 0; i < 10; i++ {
            fmt.Print(fib(i), " ")
        }
    }
    \`\`\`

---

## 🧩 3. المخططات (Mermaid)

### 3.1 مخطط انسيابي

\`\`\`mermaid
flowchart TD
    A([البداية]) --> B{البيانات صحيحة؟}
    B -- نعم --> C[معالجة البيانات]
    B -- لا --> D[رسالة خطأ]
    C --> E[(قاعدة البيانات)]
    E --> F([النهاية])
    D --> F

    style A fill:#90caf9
    style F fill:#a5d6a7
    style D fill:#ef9a9a
\`\`\`

### 3.2 مخطط تسلسلي

\`\`\`mermaid
sequenceDiagram
    actor User
    participant App
    participant API
    participant DB

    User->>App: تسجيل الدخول
    App->>API: POST /login
    activate API
    API->>DB: التحقق من المستخدم
    activate DB
    DB-->>API: بيانات المستخدم
    deactivate DB
    API-->>App: JWT Token
    deactivate API
    App-->>User: مرحباً بك 👋
\`\`\`

### 3.3 مخطط ذهني

\`\`\`mermaid
mindmap
  root((مبادئ SOLID))
    SRP
      مسؤولية واحدة
      سبب واحد للتغيير
    OCP
      مفتوح للتوسّع
      مغلق للتعديل
    LSP
      قابلية الاستبدال
    ISP
      واجهات صغيرة
    DIP
      الاعتماد على التجريد
\`\`\`

### 3.4 مخطط زمني

\`\`\`mermaid
timeline
    title تطور الويب الحديث
    1995 : CGI و Apache
    2006 : إطلاق AWS EC2
    2013 : Docker والحاويات
    2014 : إطلاق Kubernetes
    2020 : GitOps و IaC
    2024 : منصات الذكاء الاصطناعي
\`\`\`

### 3.5 مخطط Git

\`\`\`mermaid
gitGraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Setup CI"
    branch feature-auth
    checkout feature-auth
    commit id: "Add OAuth"
    checkout develop
    merge feature-auth
    checkout main
    merge develop tag: "v1.0.0"
\`\`\`

### 3.6 مخطط دائري

\`\`\`mermaid
pie title توزيع الزيارات
    "جوّال" : 52
    "حاسوب" : 28
    "لوحي" : 12
    "أخرى" : 8
\`\`\`

---

## ✅ 4. قوائم المهام

### خطة المشروع
- [x] تصميم الواجهة
- [x] دعم Mermaid
- [x] إضافة Callouts
- [x] إضافة Tabs
- [x] إضافة Grid Layout
- [ ] اختبار على Safari
- [ ] إصدار v8.0
  - [ ] كتابة التوثيق
  - [ ] إعداد الإصدار

### قائمة تسوّق
- [ ] خبز
- [ ] حليب
- [x] قهوة ☕

---

## ∑ 5. المعادلات الرياضية

### معادلة أويلر

$$e^{i\\pi} + 1 = 0$$

### تكامل غاوس

$$\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}$$

### مصفوفة

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}$$

### معادلة سطرية

متوسط الطاقة الحركية: $\\bar{E} = \\frac{1}{2}kT$ حيث $k$ هو ثابت بولتزمان.

---

## ▶ 6. تشغيل JavaScript

اضغط زر **تشغيل** لتنفيذ الكود مباشرة في المتصفح.

### 6.1 ترتيب سريع

\`\`\`javascript
const quickSort = (arr) => {
  if (arr.length <= 1) return arr;
  const [pivot, ...rest] = arr;
  const left  = rest.filter((x) => x < pivot);
  const right = rest.filter((x) => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
};

console.log("مرتب:", quickSort([3, 6, 1, 8, 2, 9, 4]));
console.log("مضاعف:", [1, 2, 3].map((n) => n * 2));
\`\`\`

### 6.2 التعامل مع البيانات

\`\`\`javascript
const users = [
  { name: "أحمد", age: 30, role: "admin" },
  { name: "سارة", age: 25, role: "editor" },
  { name: "محمد", age: 35, role: "viewer" },
];

users.filter((u) => u.age > 28).forEach((u) => console.log(u));
\`\`\`

---

## 📊 7. الرسوم البيانية (Plotly)

### 7.1 رسم خطي

\`\`\`plotly
{
  "data": [
    {"x":[1,2,3,4,5],"y":[10,15,13,17,12],"type":"scatter","name":"السلسلة A","mode":"lines+markers"},
    {"x":[1,2,3,4,5],"y":[7,11,9,14,8],"type":"scatter","name":"السلسلة B","mode":"lines+markers"}
  ],
  "layout":{"title":"مخطط تفاعلي","paper_bgcolor":"transparent","plot_bgcolor":"transparent"}
}
\`\`\`

### 7.2 مخطط أعمدة

\`\`\`plotly
{
  "data": [{
    "x":["الرياض","جدة","الدمام","مكة","المدينة"],
    "y":[85,62,48,40,35],
    "type":"bar",
    "marker":{"color":["#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe"]}
  }],
  "layout":{"title":"توزيع المستخدمين حسب المدينة","paper_bgcolor":"transparent","plot_bgcolor":"transparent"}
}
\`\`\`

---

## 🗺️ 8. الخرائط التفاعلية

### إسطنبول

\`\`\`map
41.015, 28.979, 13
\`\`\`

### الرياض

\`\`\`map
24.7136, 46.6753, 12
\`\`\`

---

## 🔗 9. الحواشي والمراجع

هذا نص عربي يحتوي على حاشية[^1]، وحاشية أخرى مطوّلة[^longnote]، وحاشية بالإنجليزية[^eng].

[^1]: الحاشية الأولى: معلومة إضافية.

[^longnote]: حاشية أطول تحتوي على **تنسيقات**، *مائل*، \`كود سطري\`، و[رابط](https://example.com).

[^eng]: English footnote with *emphasis* and \`code\`.

---

## 📋 10. الجداول

### مقارنة لغات البرمجة

| اللغة | الأداء | الاستخدام | الشهرة |
|--------|:------:|-----------|:------:|
| Python | متوسط | AI / Data | ⭐⭐⭐⭐⭐ |
| Rust   | عالٍ جداً | الأنظمة | ⭐⭐⭐⭐ |
| Go     | عالٍ | Backend | ⭐⭐⭐⭐ |
| JavaScript | متوسط | الويب | ⭐⭐⭐⭐⭐ |

### جدول بمحاذاة مخصصة

| يمين | وسط | يسار |
|------:|:---:|:-----|
| 100 | 200 | 300 |
| ABC | DEF | GHI |

---

## 📝 11. القوائم المتداخلة

- **الواجهة الأمامية**
  - React / Next.js
    - Server Components
    - App Router
  - Vue.js
  - Svelte

- **الواجهة الخلفية**
  1. Node.js
     - Express
     - Fastify
     - NestJS
  2. Python
     - Django
     - FastAPI
  3. Go
     - Gin
     - Echo

- **قواعد البيانات**
  - علائقية: PostgreSQL, MySQL
  - NoSQL: MongoDB, Redis
  - Vector: Pinecone, Weaviate

---

## 💻 12. الأكواد الملوّنة

### Python

\`\`\`python
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str
    role: str = "user"

    def promote(self, new_role: str) -> None:
        self.role = new_role

user = User(1, "أحمد", "ahmed@example.com")
user.promote("admin")
print(user)
\`\`\`

### SQL

\`\`\`sql
SELECT
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 10;
\`\`\`

### YAML

\`\`\`yaml
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: secret
\`\`\`

### JSON

\`\`\`json
{
  "name": "markdown-editor",
  "version": "8.0.0",
  "features": ["mermaid", "plotly", "latex", "docx", "grid"],
  "active": true,
  "config": {
    "theme": "auto",
    "language": "ar",
    "autosave": true
  }
}
\`\`\`

### Bash

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

for file in *.md; do
  echo "Processing: $file"
  wc -l "$file"
done
\`\`\`

---

## 🎨 13. التنسيقات السطرية

- **عريض** و *مائل* و ***عريض مائل*** و ~~محذوف~~.
- كود سطري: \`const x = 42;\`
- روابط: [GitHub](https://github.com) · [Mermaid](https://mermaid.js.org) · [Markdown Guide](https://www.markdownguide.org)
- اختصارات لوحة المفاتيح: <kbd>Ctrl</kbd> + <kbd>S</kbd>
- رموز: ✅ ❌ ⚠️ 🚨 ℹ️ 💡 📘 ⬡ ∑ 🔗 🗺️ 📊

---

## 📐 14. شبكة التخطيط (Grid Layout)

قسّم المحتوى إلى أعمدة متعددة باستخدام \`:::grid\` و \`:::item\`.

### 14.1 بطاقات إحصائية

:::grid columns=3 gap=16
:::item
### المبيعات
**1,250,000 ر.س**
:::
:::item
### العملاء
**8,420 عميل**
:::
:::item
### النمو
**+18.4%**
:::
:::

### 14.2 مخطط بجانب جدول

:::grid columns=2 gap=16
:::item
#### مبيعات الربع الأول

\`\`\`mermaid
xychart-beta
    title "Sales Q1"
    x-axis [Jan, Feb, Mar]
    y-axis "Units" 0 --> 100
    bar [40, 62, 78]
\`\`\`
:::
:::item
#### تفاصيل المبيعات

| الشهر | الوحدات | النمو |
|:-----:|:-------:|:-----:|
| يناير | 40 | — |
| فبراير | 62 | +55% |
| مارس | 78 | +26% |
:::
:::

### 14.3 عنصر ممتد (span)

:::grid columns=3 gap=16
:::item span=2
### المحتوى الرئيسي

هذا العنصر يمتد على عمودين من أصل ثلاثة. يمكن أن يحتوي على **نص**، قوائم، جداول، أو حتى كود.

- نقطة أولى
- نقطة ثانية
:::
:::item
### الشريط الجانبي

محتوى جانبي.
:::
:::

### 14.4 نسب مخصصة (2fr 1fr)

:::grid columns="2fr 1fr" gap=20
:::item
### المحتوى الرئيسي (⅔)

هذا العمود يأخذ ثلثي العرض. مثالي للمحتوى الطويل الذي يحتاج مساحة أكبر.
:::
:::item
### الملخص (⅓)

هذا العمود يأخذ الثلث.
:::
:::

### 14.5 شبكة متداخلة

:::grid columns=2 gap=16
:::item
### مجموعة أ

:::grid columns=2 gap=8
:::item
خيار 1
:::
:::item
خيار 2
:::
:::
:::
:::item
### مجموعة ب

نص عادي في العمود الآخر.
:::
:::

---

## 🌍 15. دعم العربية والإنجليزية

### نص عربي بالكامل

هذا نص عربي يجب أن يبدأ من **اليمين** وينتهي عند اليسار، مع دعم كامل للتشكيل: "مَرْحَبًا بِكُمْ فِي المُحَرِّرِ العَرَبِيِّ" — والحروف المتصلة تُعرض بشكل صحيح.

### نص مختلط

هذا نص عربي يحتوي على مصطلح **Markdown**، وكود \`console.log()\`، ورابط [Google](https://google.com) — كلها تظهر باتجاه صحيح.

### نص إنجليزي بالكامل

This is a fully English paragraph that should start from the **left** and end at the right, with proper spacing and punctuation.

---

## 📌 16. اقتباسات

> **اقتباس بسيط**
> يمتد على عدة أسطر ويحتوي على **تنسيقات** و*مائل* و\`كود\`.

> **اقتباس متداخل**
> > اقتباس داخل اقتباس.
> > > اقتباس من المستوى الثالث.

---

## 🚀 17. التصدير

من زر **Export** في الشريط العلوي:

| الصيغة | الامتداد | ملاحظة |
|--------|---------|--------|
| Word | \`.docx\` | يحفظ التنسيق والألوان والجداول والمخططات |
| PDF | \`.pdf\` | مثالي للطباعة |
| Markdown | \`.md\` | للنقل إلى محرّر آخر |
| Plain Text | \`.txt\` | نص خام |
| PowerPoint | \`.pptx\` | عرض تقديمي |

---

## 🎓 خاتمة

هذا المحرّر يجمع **قوة Markdown** مع **إمكانيات الويب التفاعلية**:

1. **كتابة سريعة** — Markdown نظيف وسهل.
2. **معاينة فورية** — بدون تأخير.
3. **تفاعل حقيقي** — نفّذ JavaScript، تفاعل مع Plotly، تنقّل في الخرائط.
4. **تصدير احترافي** — Word، PDF، PPTX بضغطة واحدة.
5. **دعم RTL/LTR** — العربية والإنجليزية في نفس المستند.
6. **تخطيط مرن** — Grid لبناء لوحات وبطاقات وتقارير غنية.

> **جرّب الآن**: عدّل هذا النص، اضغط **Ctrl+S**، ثم صدّر النتيجة!

---

`;
