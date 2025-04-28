module.exports = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/iot_platform',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_key',
  mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  jwtExpiration: 86400, // 24小时
  environment: process.env.NODE_ENV || 'development'
}; 