import { StyleSheet, Text } from "react-native";
type Props={
    title:String;
};

export default function ScreenTitle({title}:Props){
    return <Text style = {styles.title}>{title}</Text>;
}

const styles=StyleSheet.create({
    title:{
        fontSize:28,
        fontWeight:"bold",
        textAlign:"center",
        marginBottom:30,
    },
});