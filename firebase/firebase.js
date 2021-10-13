import firebase from 'firebase'


const firebaseConfig = {
  apiKey: "AIzaSyA40ImJKKALtaTe66cM7__gOk4JEuk1ORU",
  authDomain: "native-app-5402f.firebaseapp.com",
  projectId: "native-app-5402f",
  storageBucket: "native-app-5402f.appspot.com",
  messagingSenderId: "656672557503",
  appId: "1:656672557503:web:0d35cd9bf5fa68c6f7f90a",
};

!firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app()

const db = firebase.firestore()
// const db = app.firestore()
// const auth = firebase.auth()

export { firebase, db }