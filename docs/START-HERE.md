# Start here – one small path

Ignore the big task list. Do these **4 steps** in order. That’s it.

---

## Step 1: Run the app

In a terminal, from the project folder:

```bash
npm run dev
```

Wait until you see something like: `Ready on http://localhost:3000`

Open **http://localhost:3000** in your browser. You should see the home page (auth status and maybe an advertiser count).

---

## Step 2: Sign in

- Click **Sign in** (or **Sign up** if you don’t have an account yet).
- Complete Clerk’s sign-in/sign-up flow.

After that, you’ll probably be sent to **/pending** (a “waiting for approval” page). That’s expected: new users are inactive until you flip a switch in the database.

---

## Step 3: Activate your user in Supabase

1. Go to [Supabase](https://supabase.com) → your project.
2. Open **Table Editor** in the left sidebar.
3. Select the **User** table.
4. Find the row for your account (match by email or the `clerkId` you see in the app).
5. Click the **isActive** cell and change it from `false` to **true**.
6. Save (e.g. tick/check or press Enter, depending on the UI).

---

## Step 4: See the dashboard

Back in your browser, go to **http://localhost:3000** or click the app link in the header (e.g. “LinkedIn Ads Intelligence”).

You should be redirected to the **dashboard**: Explore, Collections, Advertisers. The pages are still simple, but you’re in.

---

**Done.** You’ve run the app, signed in, activated your user, and seen the dashboard. When you’re ready for the next small step, we can pick one (e.g. “run the scraper test” or “add one thing to the Explore page”).
