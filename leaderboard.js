/* =========================================================
   Stewybear — classement mondial (Supabase)
   ---------------------------------------------------------
   Pour activer le classement mondial :
   1. Crée un projet gratuit sur https://supabase.com
   2. Dans l'éditeur SQL, exécute :

        create table public.scores (
          id         bigint generated always as identity primary key,
          name       text not null check (char_length(name) between 1 and 16),
          score      integer not null check (score >= 0 and score <= 1000000),
          created_at timestamptz not null default now()
        );

        alter table public.scores enable row level security;

        create policy "lecture publique"
          on public.scores for select
          to anon using (true);

        create policy "ajout public"
          on public.scores for insert
          to anon with check (
            char_length(name) between 1 and 16 and score >= 0
          );

   3. Dans Project Settings → API, copie l'URL du projet et la clé
      « anon public », puis colle-les ci-dessous.

   La clé « anon » est conçue pour être publique (le navigateur la voit
   forcément) : la sécurité repose sur les règles RLS ci-dessus.
   ========================================================= */

const SUPABASE_URL = "https://ejqwmgvvtgepatkpdlby.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4r84Fxt3OB3kC0InO9Z8nA_X4TLKepu";

const Leaderboard = (() => {
  const configured =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR-PROJECT") &&
    !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY");

  const base = SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/scores";
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: "Bearer " + SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };

  async function top(limit = 10) {
    if (!configured) throw new Error("leaderboard non configuré");
    const url = `${base}?select=name,score&order=score.desc&order=created_at.asc&limit=${limit}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function submit(name, score) {
    if (!configured) throw new Error("leaderboard non configuré");
    const clean = String(name).trim().slice(0, 16);
    const value = Math.max(0, Math.floor(Number(score) || 0));
    if (!clean) throw new Error("pseudo vide");
    const res = await fetch(base, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ name: clean, score: value }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return true;
  }

  return { enabled: configured, top, submit };
})();

window.Leaderboard = Leaderboard;
