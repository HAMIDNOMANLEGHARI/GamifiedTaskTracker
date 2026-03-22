# 🎮 QuestLog (Gamified Productivity App)

Hey Everyone! So basically, I got tired of boring to-do lists that just stare at you and make you feel bad, so I decided to build a gamified productivity app where you literally level up in real life by doing your tasks. Think of it like a mix of an RPG and an organized calendar. Grinding productivity should actually be fun, right?

### 🌟 Features
- **Task Board & XP System**: Put stuff you need to do, check it off, get XP. Pretty standard but it feels so good to see the progress bar fill up. Complete tasks to level up your character.
- **The Reward Vault (Shop)**: This is where you flex your hard-earned levels. Unlock sick themes, custom emojis for your avatar, legendary titles (like "Productivity God"), and even glowing profile rings. The higher your level, the more elite the loot.
- **Global Tavern**: A dope social feed where you can see what other people are grinding on. Post updates, react with hearts, and see who's currently active in the real-time chat.
- **Rivalries & Social Mastery**: Ngl this is my favorite part. You can search other players and start rivalries. Added a full-blown friend system so you can follow/unfollow your homies (or rivals) and track their progress on the leaderboard. Good ol' competitive motivation for when you're feeling lazy.
- **Smart Quest Generator**: Uses some AI magic to create personalized "quests" and breakdown huge tasks into smaller chunks.
- **Deep Analytics**: Got some dope charts and an activity calendar (kinda like the GitHub contribution graph) so you can track your daily streak.
- **Confetti!**: Because who doesn't like a little celebration when they finish a task? 🎉

### 💻 Tech Stack
I built this using:
- **Next.js 14** (App Router mostly, it's pretty sick)
- **React & TypeScript** (because static typing saves lives, obviously)
- **Tailwind CSS** (for that buttery smooth styling without the headache)
- **Supabase** (for backend, database, and real-time subscriptions - it's open source Firebase vibes and I love it)
- **Framer Motion** (for the sweet animations)
- **Zustand** (for state management, way lighter than Redux)
- **Lucide React** (for those crisp icons)

### 🚀 How to Run It Locally
Alright, if you wanna clone this and run it on your own machine, here's the deal:
1. **Clone it**: `git clone <your-repo-url>` 
2. **Install modules**: Drop a quick `npm install` in your terminal.
3. **Environment vars**: Make a `.env.local` file in the root. You'll need your Supabase `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus whatever API keys you need for the AI (like Google Gemini).
4. **Boot it up**: Run `npm run dev` and hit up `http://localhost:3000` in your browser.

### 🧠 My Approach & Code Overview
Honestly, the approach was basically "make productivity less painful by adding dopamine hits." 

I started by setting up the core layout (`src/app/dashboard/layout.tsx`) and the main sidebar so you can navigate around easily. Then I wired up the internal state with Zustand for real-time updates on XP and levels.

The `src/app/dashboard/shop` handles the Reward Vault logic, checking your level against `SHOP_ITEMS` before letting you equip that legendary title.

The `src/app/dashboard/community` and `src/components/GlobalTavern.tsx` are where the social features chill. Use real-time Supabase channels to sync chat and reactions instantly. I set up player search (`PlayerSearch.tsx`) so you can actually find your friends, follow them, and start a rivalry.

The `TaskBoard.tsx` handles the main interactions. Once you complete a task, the confetti pops using `canvas-confetti` (because why not?) and your XP goes up.

I structured it so that Server Components do the heavy lifting for data fetching where possible, and Client Components (`"use client"`) handle the interactivity (the Framer Motion stuff, the charts, state updates). 

Enjoy exploring the code! If you find any bugs... well, let's just call them unannounced features for now. Just kidding, submit a PR if you want. Peace! ✌️
