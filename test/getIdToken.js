const firebase = require("../firebase");

// Simulating Google Sign-In (This would be done by the frontend normally)
firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
  .then((result) => {
    // Get the ID token after sign-in
    result.user.getIdToken().then((idToken) => {
      console.log("Firebase ID Token:", idToken);
    });
  })
  .catch((error) => {
    console.error("Error signing in:", error);
  });
