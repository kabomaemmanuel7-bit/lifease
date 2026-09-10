# LifEase

Le bon service, près de vous.

## Démarrer en local (Termux)

1. Installe Node.js si ce n'est pas déjà fait :
   ```
   pkg install nodejs
   ```

2. Décompresse ce projet et place-toi dedans :
   ```
   cd lifease
   ```

3. Installe les dépendances :
   ```
   npm install
   ```

4. Lance le serveur de développement :
   ```
   npm run dev
   ```

5. Ouvre `http://localhost:3000` dans ton navigateur (sur le même appareil).

## Ce qui est fait à ce stade

- Structure du projet Next.js + TypeScript + Tailwind
- Design system : couleurs bordeaux/blanc, composants Button, Card, Badge
- Logo LifEase (composant réutilisable)
- Page d'accueil statique (pas encore connectée à une base de données)

## Prochaine étape

Connexion à Supabase (base de données + authentification).
