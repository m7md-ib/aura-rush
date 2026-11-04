# Aura Rush

لعبة سرعة: اجمع الهالة، كبّر الإيجو، واهزم الزعماء. العب على https://aura-rush.vercel.app

## الملفات
- `index.html` — واجهة اللعبة والتصميم
- `game.js` — كل منطق اللعبة (Canvas 2D، بدون مكتبات)
- `leaderboard.html` — صفحة لوحة الأبطال
- `vercel.json` — إعدادات Vercel (روابط بدون .html)
- `assets/` — الأصوات والصور (لاحقاً)

## السيرفر
النتائج والعرش على Supabase (مشروع `aura-rush`). المفتاح الموجود بالكود هو المفتاح العام (publishable)، والحماية بتصير بقواعد السيرفر وفحص الغش.

## النشر
أي `push` على فرع `main` بينشر الموقع تلقائياً على Vercel.
auto-deploy test
