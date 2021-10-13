import React, { useLayoutEffect, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Avatar } from 'react-native-elements'
import { SafeAreaView } from 'react-native-safe-area-context'
import CustomListItem from '../components/CustomListItem'
import {firebase, db} from '../firebase/firebase'

import { AntDesign, SimpleLineIcons } from '@expo/vector-icons'

const HomeScreen = ({ navigation }) => {

     const [ chats, setChats] = useState([])

     const signOutUser = () => {
          firebase.auth().signOut()
               .then( () => navigation.replace('Login'))
     }
     
     useEffect(() => {
          const unsubscribe = db.collection('chat').onSnapshot( snapshot => 
               setChats(snapshot.docs.map(doc => ({ 
                    id: doc.id,
                    data: doc.data(),
               })))
          )
          
          return unsubscribe
     }, [])

     useLayoutEffect(() => {
          navigation.setOptions({
               title: 'Signal',
               headerStyle: { backgroundColor: 'lightgray'},
               headerTitleStyle: {color: 'black'},
               headerTintColor: 'black',
               headerLeft: () =>(
                     <View style={{ marginLeft: 20 }}>
                   
                    <TouchableOpacity onPress={signOutUser} activeOpacity={0.5}>
                          <Avatar rounded source={{ uri: firebase.auth().currentUser.photoURL  }}/>
                    </TouchableOpacity>
               </View>
               ),
               headerRight: () => (

               <View style={{
                          marginRight: 20 ,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: 80
                          }}>
                    <TouchableOpacity activeOpacity={0.5}>
                         <AntDesign name="camerao" size={24} color="black"/>
                    </TouchableOpacity>

                    <TouchableOpacity 
                         onPress={() => navigation.navigate('AddChat')}
                         activeOpacity={0.5}>
                         <SimpleLineIcons name="pencil" size={24} color="black"/>

                    </TouchableOpacity>
               </View>
               )
          })
     }, [navigation])

     const enterChat = (id, chatName) => {
          navigation.navigate('Chat', {
               id,
               chatName
          })
     }

     return (
          <SafeAreaView>
               <ScrollView style={styles.scrollContainer}>
                    {chats.map(({ id, data: { chatName} }) => (
                          <CustomListItem 
                          key={id} 
                          id={id} 
                          chatName={chatName}
                          enterChat={enterChat}
                          />
                    ))}
                   
               </ScrollView>
          </SafeAreaView>
     )
}

export default HomeScreen

const styles = StyleSheet.create({
     outButton:{
          backgroundColor: 'gray',
          color: 'black',
          padding: '5px 15px',
     },
     scrollContainer: {
          height: '100%'
     }
})
