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

const Button = ({ label, onPress }) =>
	<TouchableOpacity style={styles.button} onPress={onPress}>
		<Text style={{ color: '#fff' }}>{label}</Text>
	</TouchableOpacity>

class BluetoothSerialExample extends Component {
	constructor (props) {
		super(props)
		this.state = {
			discovering: false,
			devices: [],
			connected: false,
			data: ''
		}
	}

	componentWillMount () {
		Promise.all([
			BluetoothSerial.isEnabled(),
			BluetoothSerial.list()
		])
			.then((values) => {
				const [ isEnabled, devices ] = values
				this.setState({ isEnabled, devices })
			})

		BluetoothSerial.on('bluetoothEnabled', () => Console.log('Bluetooth enabled'))
		BluetoothSerial.on('bluetoothDisabled', () => Console.log('Bluetooth disabled'))
		BluetoothSerial.on('connectionLost', () => {
			Console.log(`Connection to device has been lost`)
			this.setState({ connected: false })
		})
		BluetoothSerial.on('data', (data) => {
			this.setState({ connected: false, data: data })
		})
	}

	connect () {
		this.setState({ connecting: true })
		BluetoothSerial.connect('20:14:04:15:36:25')
			.then((res) => {
				Console.log(`Connected to device`)
				this.setState({ connected: true, connecting: false })
			})
			.catch((err) => Console.log(err))

		if (this.state.connected) {
			BluetoothSerial.subscribe('\n')
				.then((res) => {
					this.setState({ data: res })
				})
				.catch((err) => Console.log(err))
		}
	}

	write (message) {
		if (!this.state.connected) {
		}

		BluetoothSerial.write(message)
			.then((res) => {
				this.setState({ connected: true })
			})
			.catch((err) => Console.log(err))
	}

	writePackets (message, packetSize = 64) {
		const toWrite = iconv.encode(message, 'cp852')
		const writePromises = []
		const packetCount = Math.ceil(toWrite.length / packetSize)

		for (var i = 0; i < packetCount; i++) {
			const packet = new Buffer(packetSize)
			packet.fill(' ')
			toWrite.copy(packet, 0, i * packetSize, (i + 1) * packetSize)
			writePromises.push(BluetoothSerial.write(packet))
		}

		Promise.all(writePromises)
			.then((result) => {
			})
	}

	render () {
		return (
			<View style={styles.container}>
				<Text style={styles.heading}>Bluetooth Serial Example</Text>

				<View style={{ backgroundColor: '#eee' }}>
					<Text>t = {this.state.data}</Text>
				</View>

				<View style={styles.connectionInfoWrapper}>
					<View>
						{this.state.connected
							? (
								<Text style={styles.connectionInfo}>
									✓ Connected
								</Text>
							) : (
								<Text style={[styles.connectionInfo, { color: '#ff6523' }]}>
									✗ Not connected to any device
								</Text>
							)}
					</View>
				</View>

				<View style={{ flexDirection: 'row', justifyContent: 'center' }}>
					<Button
						label='Write to device'
						onPress={this.write.bind(this, 'test')}
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