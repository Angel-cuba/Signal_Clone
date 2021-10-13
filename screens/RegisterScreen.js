import { StatusBar } from 'expo-status-bar'
import React, { useState, useLayoutEffect } from 'react'
import { StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native'
import { Button, Input } from 'react-native-elements'
import {firebase } from '../firebase/firebase'

const RegisterScreen = ({ navigation }) => {
      const [ name, setName ] = useState('')
      const [ email, setEmail] = useState('')
      const [password, setPassword ] = useState('')
      const [ imageUrl, setImageUrl] = useState('')

      useLayoutEffect(() => {
           navigation.setOptions({
               headerBackTitle: "Back to Login",
               headerTintColor: {color: 'white'}
           })
      }, [navigation])

     const register = () =>{
          
               firebase.auth().createUserWithEmailAndPassword(email, password)
                    .then((authUser) => {
                         authUser.user.updateProfile({
                              displayName: name,
                              photoURL: imageUrl || "https://res.cloudinary.com/dqaerysgb/image/upload/v1630358737/jooly8uzpykfvixik2vv.jpg"
                         })
                    })
                    .catch((error) => alert(error.message))
     }

     return (
          <KeyboardAvoidingView behavior="padding" style={styles.container}>
               <StatusBar style="light"/>


               <Text h3 style={{ marginBottom: 50 }}>
                    Create a new account
               </Text>

               <View style={styles.inputContainer}>
                    <Input 
                    placeholder="Full Name"
                    autoFocus
                    type="text"
                    value={name}
                    onChangeText={(text) =>setName(text)}
                    />
                     <Input 
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChangeText={(text) =>setEmail(text)}
                    /> 
                    <Input 
                    placeholder="Password"
                    type="password"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) =>setPassword(text)}
                    /> 
                    <Input 
                    placeholder="Profile Picture URL (optional)"
                    type="text"
                    value={imageUrl}
                    onChangeText={(text) =>setImageUrl(text)}
                    onSubmitEditing={register}
                    />
               </View>
               <Button raised styles={styles.button} onPress={register} title="Register"/>
          </KeyboardAvoidingView>
     )
}

export default RegisterScreen

const styles = StyleSheet.create({
     container :{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
          backgroundColor: 'white'
     },
     button:{ 
               width: 200,
               marginTop: 10
     },
     inputContainer:{ 
          width: 300
     }

})
