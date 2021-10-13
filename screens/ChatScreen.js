import React, {useLayoutEffect} from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Avatar } from 'react-native-elements'
import { AntDesign } from '@expo/vector-icons'

const ChatScreen = ({ navigation, route }) => {
     console.log(route)
          useLayoutEffect(() => {
               navigation.setOptions({
                    title: 'Chat',
                    headerBackTitleVisible: false,
                    headerTitleAlign: 'left',
                    headerTintColor: 'silver',
                    headerTitle: () => (
                         <View style={{ flexDirection: 'row', alignItems: 'center'}}>
                              <Avatar source={{
                                   uri: "https://res.cloudinary.com/dqaerysgb/image/upload/v1632245932/paris_mulhc4.jpg"
                              }} rounded/>
                              <Text 
                              style={{ 
                                   paddingLeft: 5, 
                                   fontWeight: '900', 
                                   fontSize: 21,
                                   color:'silver'
                                   }}>{route.params.chatName}</Text>

                         </View>
                    ),
                    // headerLeft: () => (
                    //      <TouchableOpacity>
                    //           <AntDesign name="arrowleft" size={24} color="white"/>
                    //      </TouchableOpacity>
                    // )
               })
          }, [navigation])


     return (
          <View>
               <Text>{route.params.chatName}</Text>
          </View>
     )
}

export default ChatScreen

const styles = StyleSheet.create({})
