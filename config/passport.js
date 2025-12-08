const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: false,  // We do NOT need req here
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1️⃣ Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        // 2️⃣ If user exists, login
        if (user) {
          return done(null, user);
        }

        // 3️⃣ Create new user for Google login
        user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value || null,
          googleId: profile.id,
          phone: null,          // Not required for Google users
          password: null,       // Not needed for Google users
          userImage: profile.photos?.[0]?.value || null,
        });

        return done(null, user);

      } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error, null);
      }
    }
  )
);

// Save user ID into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Retrieve user from session
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;

