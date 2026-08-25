import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';
import notificationTask from './src/tasks/notificationTask';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Runs a notification through classify + local storage without a mounted
// React tree — PrioriaHeadlessTaskService.kt starts this when
// PrioriaNotificationListener sees a notification and the app has no live
// React instance (closed/killed, not just backgrounded). Task name must
// match PrioriaHeadlessTaskService.kt's getTaskConfig() exactly.
AppRegistry.registerHeadlessTask('PrioriaNotificationTask', () => notificationTask);
