const AlertRule = require('../models/AlertRule');
const Alert = require('../models/Alert');
const socketService = require('./socketService');

// 检查数据是否触发告警规则
const checkAlertRules = async (deviceId, deviceIdentifier, data) => {
  try {
    // 获取所有适用于该设备的活跃告警规则
    const rules = await AlertRule.find({
      $and: [
        { status: 'active' },
        {
          $or: [
            { deviceIds: deviceId },
            { deviceIds: { $size: 0 } } // 应用于所有设备的规则
          ]
        }
      ]
    });

    if (!rules || rules.length === 0) {
      return;
    }

    // 检查每个规则
    for (const rule of rules) {
      // 检查冷却时间
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownPeriod * 1000;
        const timeSinceLastTrigger = Date.now() - new Date(rule.lastTriggered).getTime();
        
        if (timeSinceLastTrigger < cooldownMs) {
          continue; // 跳过冷却期内的规则
        }
      }

      // 如果字段不存在于数据中，跳过
      if (!(rule.condition.field in data)) {
        continue;
      }

      const fieldValue = data[rule.condition.field];
      const thresholdValue = rule.condition.value;
      let isAlertTriggered = false;

      // 根据运算符比较值
      switch (rule.condition.operator) {
        case '>':
          isAlertTriggered = fieldValue > thresholdValue;
          break;
        case '<':
          isAlertTriggered = fieldValue < thresholdValue;
          break;
        case '>=':
          isAlertTriggered = fieldValue >= thresholdValue;
          break;
        case '<=':
          isAlertTriggered = fieldValue <= thresholdValue;
          break;
        case '==':
          isAlertTriggered = fieldValue == thresholdValue;
          break;
        case '!=':
          isAlertTriggered = fieldValue != thresholdValue;
          break;
        default:
          continue;
      }

      // 如果告警被触发
      if (isAlertTriggered) {
        await createAlert(rule, deviceId, deviceIdentifier, fieldValue, thresholdValue);
        
        // 更新规则的最后触发时间
        await AlertRule.findByIdAndUpdate(rule._id, {
          lastTriggered: new Date()
        });
      }
    }
  } catch (error) {
    console.error('检查告警规则时出错:', error);
  }
};

// 创建新告警
const createAlert = async (rule, deviceId, deviceIdentifier, triggerValue, thresholdValue) => {
  try {
    const alertMessage = `设备 ${deviceIdentifier} 的 ${rule.condition.field} 值 ${triggerValue} ${getOperatorText(rule.condition.operator)} ${thresholdValue}`;
    
    const newAlert = new Alert({
      deviceId,
      deviceIdentifier,
      type: rule.severity,
      message: alertMessage,
      details: new Map([
        ['ruleName', rule.name],
        ['field', rule.condition.field],
        ['operator', rule.condition.operator],
        ['condition', `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`]
      ]),
      triggerValue,
      thresholdValue,
      ruleId: rule._id,
      status: 'active'
    });

    const savedAlert = await newAlert.save();
    
    // 通过Socket.io发送通知
    socketService.emitEvent('newAlert', {
      alertId: savedAlert._id,
      deviceId: deviceIdentifier,
      message: alertMessage,
      severity: rule.severity,
      timestamp: savedAlert.timestamp
    });

    // 处理告警动作（邮件、SMS等）
    handleAlertActions(rule, savedAlert);

    return savedAlert;
  } catch (error) {
    console.error('创建告警时出错:', error);
    return null;
  }
};

// 处理告警动作
const handleAlertActions = async (rule, alert) => {
  try {
    // 处理每个配置的动作
    for (const action of rule.actions) {
      switch (action.type) {
        case 'email':
          // 实现邮件发送逻辑
          console.log(`应发送邮件告警: ${alert.message}`);
          break;
        case 'sms':
          // 实现SMS发送逻辑
          console.log(`应发送SMS告警: ${alert.message}`);
          break;
        case 'notification':
          // 已通过Socket.io处理
          break;
        case 'webhook':
          // 实现webhook调用逻辑
          if (action.config && action.config.url) {
            console.log(`应调用Webhook: ${action.config.url}`);
          }
          break;
        default:
          break;
      }
    }
  } catch (error) {
    console.error('处理告警动作时出错:', error);
  }
};

// 更新告警状态
const updateAlertStatus = async (alertId, status, userId, notes) => {
  try {
    const update = { status };
    
    if (status === 'acknowledged') {
      update.acknowledgedBy = userId;
      update.acknowledgedAt = new Date();
      update.notes = notes;
    } else if (status === 'resolved') {
      update.resolvedBy = userId;
      update.resolvedAt = new Date();
      update.notes = notes;
    }
    
    const updatedAlert = await Alert.findByIdAndUpdate(
      alertId,
      update,
      { new: true }
    ).populate('deviceId', 'name deviceId');
    
    if (updatedAlert) {
      socketService.emitEvent('alertStatusChanged', {
        alertId,
        status,
        deviceId: updatedAlert.deviceId.deviceId,
        message: updatedAlert.message
      });
    }
    
    return updatedAlert;
  } catch (error) {
    console.error('更新告警状态时出错:', error);
    return null;
  }
};

// 辅助函数：获取操作符的文本描述
const getOperatorText = (operator) => {
  switch (operator) {
    case '>': return '大于';
    case '<': return '小于';
    case '>=': return '大于或等于';
    case '<=': return '小于或等于';
    case '==': return '等于';
    case '!=': return '不等于';
    default: return operator;
  }
};

module.exports = {
  checkAlertRules,
  createAlert,
  updateAlertStatus
}; 