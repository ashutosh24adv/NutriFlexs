const {
  createRunOncePlugin,
  withMainActivity,
  withAndroidManifest,
} = require('@expo/config-plugins');

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const RATIONALE_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_PERMISSION_USAGE_ALIAS = 'ViewPermissionUsageActivity';
const DELEGATE_IMPORT = 'dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const DELEGATE_CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

/**
 * Updates MainActivity (.kt or .java) to import and initialize HealthConnectPermissionDelegate
 */
function modifyMainActivity(contents, isKotlin) {
  let newContents = contents;

  // Add import if not present
  if (!newContents.includes(DELEGATE_IMPORT)) {
    const importStatement = `import ${DELEGATE_IMPORT}${isKotlin ? '' : ';'}`;
    const packageMatch = newContents.match(/^package .*;?/m);
    if (packageMatch) {
      const insertIndex = packageMatch.index + packageMatch[0].length;
      newContents =
        newContents.slice(0, insertIndex) +
        `\n\n${importStatement}` +
        newContents.slice(insertIndex);
    } else {
      newContents = `${importStatement}\n${newContents}`;
    }
  }

  // Add delegate call in onCreate before super.onCreate
  if (!newContents.includes('HealthConnectPermissionDelegate.setPermissionDelegate')) {
    const superOnCreateRegex = /(super\.onCreate\s*\([^)]*\);?)/;
    if (superOnCreateRegex.test(newContents)) {
      newContents = newContents.replace(
        superOnCreateRegex,
        `    ${DELEGATE_CALL}${isKotlin ? '' : ';'}\n    $1`
      );
    }
  }

  return newContents;
}

const withHealthConnectMainActivity = (config) => {
  return withMainActivity(config, (config) => {
    const isKotlin = config.modResults.language === 'kt';
    config.modResults.contents = modifyMainActivity(
      config.modResults.contents,
      isKotlin
    );
    return config;
  });
};

/**
 * Updates AndroidManifest.xml to ensure Health Connect queries package,
 * rationale intent filter, and ViewPermissionUsageActivity alias are present.
 */
const withHealthConnectManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // 1. Ensure <queries> has <package android:name="com.google.android.apps.healthdata" />
    if (!manifest.queries) {
      manifest.queries = [];
    }
    let queriesElement = manifest.queries[0];
    if (!queriesElement) {
      queriesElement = {};
      manifest.queries.push(queriesElement);
    }
    if (!queriesElement.package) {
      queriesElement.package = [];
    }
    const hasHealthDataPackage = queriesElement.package.some(
      (pkg) => pkg.$ && pkg.$['android:name'] === HEALTH_CONNECT_PACKAGE
    );
    if (!hasHealthDataPackage) {
      queriesElement.package.push({
        $: {
          'android:name': HEALTH_CONNECT_PACKAGE,
        },
      });
    }

    // 2. Ensure application activities have rationale and alias
    if (manifest.application && manifest.application.length > 0) {
      const app = manifest.application[0];
      const mainActivity = (app.activity || []).find(
        (act) => act.$ && act.$['android:name'] === '.MainActivity'
      ) || (app.activity || [])[0];

      if (mainActivity) {
        if (!mainActivity['intent-filter']) {
          mainActivity['intent-filter'] = [];
        }
        const hasRationale = mainActivity['intent-filter'].some(
          (filter) =>
            filter.action &&
            filter.action.some(
              (act) => act.$ && act.$['android:name'] === RATIONALE_ACTION
            )
        );
        if (!hasRationale) {
          mainActivity['intent-filter'].push({
            action: [{ $: { 'android:name': RATIONALE_ACTION } }],
          });
        }
      }

      // Ensure activity-alias ViewPermissionUsageActivity
      if (!app['activity-alias']) {
        app['activity-alias'] = [];
      }
      const hasAlias = app['activity-alias'].some(
        (alias) => alias.$ && alias.$['android:name'] === VIEW_PERMISSION_USAGE_ALIAS
      );
      if (!hasAlias && mainActivity) {
        app['activity-alias'].push({
          $: {
            'android:name': VIEW_PERMISSION_USAGE_ALIAS,
            'android:exported': 'true',
            'android:targetActivity': mainActivity.$['android:name'],
            'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
                  },
                },
              ],
              category: [
                {
                  $: {
                    'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
                  },
                },
              ],
            },
          ],
        });
      }
    }

    return config;
  });
};

const withHealthConnectPermissionDelegate = (config) => {
  config = withHealthConnectMainActivity(config);
  config = withHealthConnectManifest(config);
  return config;
};

module.exports = createRunOncePlugin(
  withHealthConnectPermissionDelegate,
  'withHealthConnectPermissionDelegate',
  '1.0.0'
);

