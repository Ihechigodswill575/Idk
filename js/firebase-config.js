// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBzUELxbbaL6Wb_M1uNhjwlZHVTorN9XJs",
    authDomain: "my-whatsapp-2c1af.firebaseapp.com",
    databaseURL: "https://my-whatsapp-2c1af-default-rtdb.firebaseio.com",
    projectId: "my-whatsapp-2c1af",
    storageBucket: "my-whatsapp-2c1af.firebasestorage.app",
    messagingSenderId: "1089455460888",
    appId: "1:1089455460888:web:15bd0820546c813febe96d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references
const auth = firebase.auth();
const database = firebase.database();
