/**
 * Created by sylor on 16.12.16.
 */
import React, { Component } from 'react'
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Platform,
	Switch
} from 'react-native'

import BluetoothSerial from 'react-native-bluetooth-serial'
import { Buffer } from 'buffer'
global.Buffer = Buffer
const iconv = require('iconv-lite')

const DEVICE_ADDR = '20:14:04:15:36:25';

const Button = ({ label, onPress }) =>
	<TouchableOpacity style={styles.button} onPress={onPress}>
		<Text style={{ color: '#fff' }}>{label}</Text>
	</TouchableOpacity>

class BluetoothSerialExample extends Component {
	constructor (props) {
		super(props);
		this.state = {
			btEnabled: false,
			connected: false,
			connecting: false,
			temperature: null,
			debug: ''
		}
	}

	componentWillMount () {
		Promise.all([
			BluetoothSerial.isEnabled()
		])
			.then((values) => {
				const [ enabled ] = values;
				this.setState({ btEnabled: enabled });
			});

		BluetoothSerial.on('bluetoothEnabled', () => {
			this.setState({ btEnabled: true });
		});
		BluetoothSerial.on('bluetoothDisabled', () => {
			this.setState({ btEnabled: false });
		});
		BluetoothSerial.on('connectionLost', () => {
			this.setState({ connecting: false, connected: false });
		});
	}

	connect () {
		if (this.state.btEnabled && !this.state.connected && !this.state.connecting) {
			this.setState({ connecting: true });
			BluetoothSerial.connect(DEVICE_ADDR)
				.then((res) => {
					this.setState({ connected: true, connecting: false });
				})
				.catch((err) => {
					this.setState({ connecting: false, debug: this.state.debug + '\nconnect caught err: ' + err });
				});
		}
	}

	write (message) {
		if (this.state.connected) {
			BluetoothSerial.write('t')
				.then((res) => {
					this.setState({ temperature: null });
					BluetoothSerial.readUntil('\n')
						.then((read) => {
							this.setState({ temperature: read });
						})
						.catch((err) => {
							this.setState({ debug: this.state.debug + "\nsubscribe caught err: " + err });
						})
				})
				.catch((err) => {
					this.setState({ debug: this.state.debug + '\nwrite caught err: ' + err });
				})
		}
	}

	render () {
		return (
			<View style={styles.container}>
				<Text style={styles.heading}>BAPOMETP</Text>

				<View style={{ backgroundColor: '#369' }}>
					<Text>debug{this.state.debug}</Text>
				</View>

				<View style={{ backgroundColor: '#9C9' }}>
					<Text>{this.state.btEnabled ? (this.state.connected ? 'connected' : (this.state.connecting ? 'connecting' : 'not connected')) : 'BT disabled'}</Text>
				</View>

				<View style={{ backgroundColor: '#FC9' }}>
					<Text>t = {this.state.temperature}ºC</Text>
				</View>

				<View style={{ flexDirection: 'row', justifyContent: 'center' }}>
					<Button
						label='Write to device'
						onPress={this.write.bind(this)}
					/>
					<Button
						label='Connect'
						onPress={this.connect.bind(this)}
					/>
				</View>
			</View>
		)
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5FCFF'
	},
	heading: {
		fontWeight: 'bold',
		fontSize: 24,
		marginVertical: 10,
		alignSelf: 'center'
	},
	enableInfoWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		height: 40,
		paddingHorizontal: 25,
		alignItems: 'center'
	},
	connectionInfoWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 25
	},
	connectionInfo: {
		fontWeight: 'bold',
		alignSelf: 'center',
		fontSize: 18,
		marginVertical: 10,
		color: '#238923'
	},
	listContainer: {
		marginTop: 15,
		borderColor: '#ccc',
		borderTopWidth: 0.5
	},
	listItem: {
		flex: 1,
		padding: 25,
		borderColor: '#ccc',
		borderBottomWidth: 0.5
	},
	button: {
		margin: 5,
		padding: 25,
		backgroundColor: '#4C4C4C'
	}
})

export default BluetoothSerialExample