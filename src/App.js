import React, { Component } from 'react'
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Animated,
  Easing
} from 'react-native'

import BluetoothSerial from 'react-native-bluetooth-serial'

const DEVICE_ADDR = '20:14:04:15:36:25';
const ASK_TEMPERATURE_REQUEST = 't';
const MEASURE_PERIOD = 5000;
const REREAD_ANSWER_PERIOD = 100;

class Bapometp extends Component {
	constructor (props) {
		super(props);
		this.animatedValue = new Animated.Value(0);
		this.bubbleMoveValue = new Animated.Value(0);
		this.state = {
			btEnabled: false,
			connected: false,
			connecting: false,
			measures: [
				// {time: 5513, temperature: 42.5},
				// {time: 6813, temperature: 47.06},
				// {time: 8112, temperature: 50.81}
			],
			temperature: null,
			forecast: null,
			asking: false,
			debug: ''
		};
		this.extrapolate = require('everpolate').linear;
		// this.state.forecast = this.forecast100(this.state.measures, 8112);
	}

	componentWillMount () {
		this.subscribeBtEvents();
		this.checkBtEnabled();
	}

	componentDidMount () {
		this.animate();
		this.bubbleMove();
	}
	animate () {
			this.animatedValue.setValue(0);
			Animated.timing(
				this.animatedValue,
				{
					toValue: 1,
      		duration: 2000,
      		easing: Easing.linear
				}
			).start(() => this.animate());
	}
	bubbleMove () {
			this.bubbleMoveValue.setValue(0);
			Animated.timing(
				this.bubbleMoveValue,
				{
					toValue: 1,
      		duration: 6000
				}
			).start(() => this.bubbleMove());
	}

	render () {
		const move = this.bubbleMoveValue.interpolate({
			inputRange: [0, 1],
			outputRange: [-20, -1000]
		});
		const scaleX = this.animatedValue.interpolate({
			inputRange: [0, 0.2, 0.45, 0.7, 0.93, 1],
			outputRange: [1, 1.3, 0.9, 1.05, 1, 1]
		});
		const scaleY = this.animatedValue.interpolate({
			inputRange: [0, 0.2, 0.45, 0.7, 0.93, 1],
			outputRange: [1, 0.7, 1.1, 0.95, 1, 1]
		});
		const translateX = this.animatedValue.interpolate({
			inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
			outputRange: [0, -10, 10, -10, 10, 0]
		});
		return (
			<View style={[styles.container, this.getBackgroundColor()]} >
				<Text style={styles.heading}>BAPOMETP</Text>

				<Animated.View
						style={{
							transform: [{translateY: move}, {scaleX: scaleX}, {scaleY: scaleY}, {translateX: translateX}],
							height: 30,
							width: 30,
							borderRadius: 50,
							backgroundColor: '#fff',
						  opacity: 0.3,
							position: 'absolute',
							bottom: 0,
							borderWidth: 2,
							borderColor: '#fff',
							marginLeft: 50
						}} />

				<View style={{ backgroundColor: '#369' }}>
					<Text>debug{this.state.debug}</Text>
				</View>

				<View style={{ backgroundColor: '#9C9' }}>
					<Text>{this.state.btEnabled ? (this.state.connected ? 'connected' : (this.state.connecting ? 'connecting' : 'not connected')) : 'BT disabled'}</Text>
				</View>

				<View style={styles.currentTemperatureContainer}>
					<Text style={styles.currentTemperature}>{this.state.temperature === null ? 'no temperature' : this.state.temperature + 'ºC'}</Text>
				</View>

				<View style={styles.timerContainer}>
					<Text style={styles.timer}>{this.state.temperature >= 100 ? 'boiling' : this.state.forecast === null ? 'no forecast yet' : 'boil in: ' + this.state.forecast + 's'}</Text>
				</View>

				{/*<View>
					{this.state.measures.map((m) => <Text key={m.time}> {m.time} | {m.temperature} </Text>)}
				</View>*/}
			</View>
		)
	}

	getBackgroundColor() {
		const minTemp = 10;
		const maxTemp = 95;
		const minColor = [168, 187, 255];
		const maxColor = [255, 75, 75];
		let temperature = this.state.temperature;

		if (temperature === null || temperature <= minTemp) return this.getRgbColor(minColor);
		if (temperature >= maxTemp) return this.getRgbColor(maxColor);

		let rate = (temperature - minTemp) / maxTemp;
		let result = [0, 0, 0];
		result[0] = Math.round(Math.abs(maxColor[0] - minColor[0]) * rate) + Math.min(minColor[0], maxColor[0]);
		result[1] = Math.round(Math.abs(maxColor[1] - minColor[1]) * rate) + Math.min(minColor[1], maxColor[1]);
		result[2] = Math.round(Math.abs(maxColor[2] - minColor[2]) * rate) + Math.min(minColor[2], maxColor[2]);
		return this.getRgbColor(result);
	}

	getRgbColor(color) {
		return {
			backgroundColor: "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")"
		}
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
					let forecast = this.forecast100(measures, time);
					this.setState({ asking: false, measures: measures, temperature: temperature, forecast: forecast });
				})
				.catch((err) => {
					clearInterval(taskId);
					this.setState({ asking: false, debug: this.state.debug + "\nreadUntil caught err: " + err });
				})
		}, REREAD_ANSWER_PERIOD);
	}

	forecast100(measures, now) {
		if (measures.length < 3) {
			return null;
		}
		let interval = MEASURE_PERIOD;
		let timesCount = 30 * 60 * 1000 / interval;
		let times = Array.from({length: timesCount}, (v, k) => k + 1).map((i) => i * interval + now);
		let temperatures = this.extrapolate(
			times,
			measures.map((m) => m.time),
			measures.map((m) => m.temperature)
		);
		let boilIndex = temperatures.findIndex((t) => t >= 100);
		if (boilIndex == -1) {
			return null;
		}
		return (times[boilIndex] - now) / 1000;
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
	},
	currentTemperatureContainer: {
		marginTop: 30,
		alignSelf: 'center'
	},
	currentTemperature: {
		fontSize: 44,
		justifyContent: 'center'
	},
	timerContainer: {
		marginTop: 30,
		alignSelf: 'center'
	},
	timer: {
		fontSize: 44,
		color: '#333'
	}
});

export default Bapometp
