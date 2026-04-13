import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userSchema.js";
import { sendVerificationMail } from "../controllers/user/userController1.js";
import "dotenv/config";
import crypto from "crypto";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://figh8club.duckdns.org/auth/google/callback",
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        const referalCode = "REF-" + crypto.randomBytes(4).toString("hex");


        await sendVerificationMail(null, referalCode, profile.emails?.[0]?.value);

        user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value || null,
          googleId: profile.id,
          phone: null,
          password: null,
          referalCode: referalCode,
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

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

export default passport;

