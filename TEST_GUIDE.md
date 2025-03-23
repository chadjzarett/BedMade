# BedMade App Testing Guide

This guide provides instructions for testing the bed verification and goal achievement functionality in the BedMade app. We've included both automated tests and manual testing utilities to verify all possible user scenarios.

## Use Cases to Test

The BedMade app has the following key user scenarios that need testing:

1. **User hasn't made bed yet today**
   - App should show "Ready for Today?" prompt
   - Verify button should be active

2. **User made bed and successfully met their goal**
   - App should show "Bed Made" status
   - "Goal Achieved" badge should appear
   - Achievement card should be displayed

3. **User made bed but missed their goal**
   - App should show "Bed Made" status
   - "Goal Missed" badge should appear
   - Morning Goal Tip should be displayed

4. **User did not make the bed and missed the day**
   - Streak counter should be reset to 0
   - Today's status should show "Ready for Today?"

## Automated Tests

We've created automated tests that verify the UI behavior for each scenario. To run these tests:

1. Make sure you have the required dependencies installed:
   ```
   npm install --save-dev jest @testing-library/react-native @testing-library/react-hooks jest-expo react-test-renderer
   ```

2. Run the test script:
   ```
   bash test-goal-scenarios.sh
   ```

This script will:
- Set up the necessary testing environment
- Run tests for all four scenarios
- Report the results

## Manual Testing

For manual testing in the actual app, we've created utility functions that let you simulate each scenario:

### Testing Directly in the App

1. Import the test utilities in your development environment:
   ```javascript
   import { TestUtils } from './src/tests/manualTests';
   ```

2. Use the utilities to test different scenarios:

   ```javascript
   // Set your daily goal for testing
   await TestUtils.setDailyGoal('mid'); // Options: 'early', 'mid', 'late'
   
   // Test Scenario 1: User hasn't made bed yet today
   await TestUtils.scenarios.notVerifiedYet();
   
   // Test Scenario 2: User made bed and successfully met their goal
   await TestUtils.scenarios.goalMet();
   
   // Test Scenario 3: User made bed but missed their goal
   await TestUtils.scenarios.goalMissed();
   
   // Test Scenario 4: User made bed early (before goal time)
   await TestUtils.scenarios.earlyCompletion();
   
   // Run all scenarios in sequence (requires app reload between tests)
   await TestUtils.testAllScenarios();
   ```

### Testing Step by Step

Here's how to manually test each scenario:

#### Scenario 1: User hasn't made bed yet today
1. Run `await TestUtils.scenarios.notVerifiedYet()`
2. Reload the app
3. Verify that the "Ready for Today?" prompt appears

#### Scenario 2: User made bed and successfully met their goal
1. Set goal to mid: `await TestUtils.setDailyGoal('mid')`
2. Run `await TestUtils.scenarios.goalMet()`
3. Reload the app
4. Verify that "Bed Made" status and "Goal Achieved" badge appear

#### Scenario 3: User made bed but missed their goal
1. Set goal to mid: `await TestUtils.setDailyGoal('mid')`
2. Run `await TestUtils.scenarios.goalMissed()`
3. Reload the app
4. Verify that "Bed Made" status and "Goal Missed" badge appear

#### Scenario 4: User made bed early (before goal time)
1. Set goal to mid: `await TestUtils.setDailyGoal('mid')`
2. Run `await TestUtils.scenarios.earlyCompletion()`
3. Reload the app
4. Verify that "Bed Made" status and "Superstar!" badge appear

## Testing Goal Times

The app supports three goal times:

- **Early**: 6am-8am
- **Mid**: 8am-10am
- **Late**: 10am-12pm

When testing, ensure you test each goal setting with appropriate verification times:

```javascript
// For testing 'early' goal (6am-8am)
await TestUtils.setDailyGoal('early');
const earlyTime = new Date(); earlyTime.setHours(7, 0, 0);
await TestUtils.mockVerification(earlyTime);

// For testing 'mid' goal (8am-10am)
await TestUtils.setDailyGoal('mid');
const midTime = new Date(); midTime.setHours(9, 0, 0);
await TestUtils.mockVerification(midTime);

// For testing 'late' goal (10am-12pm)
await TestUtils.setDailyGoal('late');
const lateTime = new Date(); lateTime.setHours(11, 0, 0);
await TestUtils.mockVerification(lateTime);
```

## Debugging Tips

If you encounter issues with the tests:

1. Check the console for detailed logs
2. Verify that your user profile has the correct goal setting
3. Check that the verification time is correctly formatted in the database
4. Make sure you reload the app after each test to see the changes

## Integrating Into Your Workflow

To add these tests to your development workflow:

1. Run automated tests before each release
2. Use manual test utilities to quickly verify specific scenarios during development
3. Add additional test cases as new features are added to the verification system 