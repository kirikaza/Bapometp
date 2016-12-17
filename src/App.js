import React, { Component } from 'react'
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native'

import BluetoothSerial from 'react-native-bluetooth-serial'

const DEVICE_ADDR = '20:14:04:15:36:25';
const ASK_TEMPERATURE_REQUEST = 't';
const MEASURE_PERIOD = 1000;
const REREAD_ANSWER_PERIOD = 100;

class Bapometp extends Component {
	constructor (props) {
		super(props);
		this.state = {
			btEnabled: false,
			connected: false,
			connecting: false,
			measures: [],
			temperature: null,
			asking: false,
			debug: ''
		}
	}

	componentWillMount () {
		this.subscribeBtEvents();
		this.checkBtEnabled();
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
					<Text>{this.state.temperature === null ? 'no temperature' : this.state.temperature + 'ºC'}</Text>
				</View>

				<View>
					{this.state.measures.map((m) => <Text key={m.time}> {m.time} | {m.temperature} </Text>)}
				</View>
			</View>
		)
	}

	checkBtEnabled() {
		Promise.all([
			BluetoothSerial.isEnabled()
		])
			.then((values) => {
				const [ enabled ] = values;
				this.setBtEnabled(enabled);
			});
	}

	subscribeBtEvents() {
		BluetoothSerial.on('bluetoothEnabled', () => {
			setBtEnabled(true);
		});
		BluetoothSerial.on('bluetoothDisabled', () => {
			setBtEnabled(false);
		});
		BluetoothSerial.on('connectionLost', () => {
			this.setState({ connecting: false, connected: false });
		});
	}

	setBtEnabled(enabled) {
		this.setState({ btEnabled: enabled, connecting: false, connected: false, asking: false });
		if (enabled) {
			this.connect();
		}
	}

	connect() {
		if (!this.state.btEnabled) {
			return;
		}
		if (this.state.connected || this.state.connecting) {
			return;
		}
		this.setState({ connecting: true });
		BluetoothSerial.connect(DEVICE_ADDR)
			.then(() => {
				this.setState({ connected: true, connecting: false, asking: false });
				this.startMeasuring();
			})
			.catch((err) => {
				this.setState({ connecting: false, debug: this.state.debug + '\nconnect caught err: ' + err });
			});
	}

	startMeasuring() {
		if (!this.state.connected) {
			return;
		}
		this.setState({ measures: [] });
		let taskId = setInterval(() => {
			if (!this.state.connected) {
				clearInterval(taskId);
				return;
			}
			this.askTemperature();
		}, MEASURE_PERIOD);
	}

	askTemperature() {
		if (!this.state.connected) {
			return;
		}
		if (this.state.asking) {
			return;
		}
		this.setState({ asking: true });
		BluetoothSerial.clear()
			.then(() => {
				BluetoothSerial.write(ASK_TEMPERATURE_REQUEST)
					.then(() => {
						this.startReadingTemperatureAnswer();
					})
					.catch((err) => {
						this.setState({ asking: false, debug: this.state.debug + '\nwrite caught err: ' + err });
					})
			})
			.catch((err) => {
				this.setState({ asking: false, debug: this.state.debug + '\nclear caught err: ' + err });
			});
	}

	startReadingTemperatureAnswer() {
		let taskId = setInterval(() => {
			if (!this.state.asking) {
				clearInterval(taskId);
				return;
			}
			BluetoothSerial.readUntil('\n')
				.then((read) => {
					if (!read.length) {
						return;
					}
					clearInterval(taskId);
					let time = parseInt(read);
					let temperature = parseFloat(read.substring(read.indexOf(' ')));
					let newMeasure = { time: time, temperature: temperature };
					let measures = this.state.measures.concat([newMeasure]);
					this.setState({ asking: false, measures: measures, temperature: temperature });
				})
				.catch((err) => {
					clearInterval(taskId);
					this.setState({ asking: false, debug: this.state.debug + "\nreadUntil caught err: " + err });
				})
		}, REREAD_ANSWER_PERIOD);
	}

}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	heading: {
		fontWeight: 'bold',
		fontSize: 24,
		marginVertical: 10,
		alignSelf: 'center'
	}
});

export default Bapometp