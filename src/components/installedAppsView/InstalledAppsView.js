import React from 'react';
import PropTypes from 'prop-types';
import {
  Badge,
  Button,
  DataList,
  DataListAction,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListCell,
  DataListContent,
  DataListToggle,
  Tooltip
} from '@patternfly/react-core';
import { ChartPieIcon, ErrorCircleOIcon, HelpIcon, OnRunningIcon, OffIcon } from '@patternfly/react-icons';
import { getProductDetails, getServiceSortOrder } from '../../services/middlewareServices';
import { SERVICE_STATUSES, SERVICE_TYPES } from '../../redux/constants/middlewareConstants';
import { DEFAULT_SERVICES, getDashboardUrl } from '../../common/serviceInstanceHelpers';
import { getWorkshopUrl, isWorkshopInstallation } from '../../common/docsHelpers';

class InstalledAppsView extends React.Component {
  state = {
    currentApp: undefined,
    expanded: undefined
  };

  constructor(props) {
    super(props);
    this.state.currentApp = 0;
    this.state.expanded = [];
  }

  handleAppNameClicked = e => {
    this.setState({ currentApp: e.target.value });
  };

  isServiceUnready = svc => {
    if (svc.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
      return !svc.status === SERVICE_STATUSES.PROVISIONED;
    }

    return !svc.metadata;
  };

  isServiceProvisioned = svc => {
    if (svc.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
      return svc.status === SERVICE_STATUSES.PROVISIONED;
    }
    return (
      svc.status && svc.status.conditions && svc.status.conditions[0] && svc.status.conditions[0].status === 'True'
    );
  };

  getStatusForApp = (app, prettyName) => {
    const provisioningStatus = (
      <div className="integr8ly-state-provisioning">
        <ChartPieIcon /> &nbsp;Provisioning
      </div>
    );
    const readyStatus = (
      <div className="integr8ly-state-ready">
        <Button
          onClick={() => {
            if (!this.getRouteForApp(app) || !this.isServiceProvisioned(app)) {
              return;
            }
            prettyName === 'Red Hat AMQ'
              ? window.open(this.getRouteForApp(app).concat('/console'), '_blank')
              : window.open(this.getRouteForApp(app), '_blank');
          }}
          variant="secondary"
        >
          Open console
        </Button>
      </div>
    );
    const unavailableStatus = (
      <div className="integr8ly-state-unavailable">
        <ErrorCircleOIcon /> &nbsp;Unavailable
      </div>
    );
    const unreadyStatus = <span />;

    // Allow for non-Service Instance services
    if (app.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
      if (!app.status || app.status === SERVICE_STATUSES.UNAVAILABLE) {
        return unreadyStatus;
      }
      if (app.status === SERVICE_STATUSES.PROVISIONING) {
        return provisioningStatus;
      }
      if (app.status === SERVICE_STATUSES.PROVISIONED) {
        return readyStatus;
      }
      if (app.status === SERVICE_STATUSES.DELETING) {
        return unavailableStatus;
      }
    }

    if (app.metadata && app.metadata.deletionTimestamp) {
      return unavailableStatus;
    }

    if (app.status && app.status.conditions && app.status.conditions[0]) {
      if (app.status.provisionStatus === 'NotProvisioned') {
        return unavailableStatus;
      }
      return app.status.conditions[0].status === 'True' ? readyStatus : provisioningStatus;
    }
    return unreadyStatus;
  };

  getRouteForApp = app => {
    if (
      isWorkshopInstallation &&
      (app.name === DEFAULT_SERVICES.FUSE_MANAGED || app.name === DEFAULT_SERVICES.THREESCALE)
    ) {
      return getWorkshopUrl(app.name, this.props.username, this.props.openshiftHost);
    }
    if (app.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
      return app.url;
    }
    // Ensure AMQ online console link points to the 'parent' amq console and not to an address space. This should only be applied for OS3
    if (
      window.OPENSHIFT_CONFIG.openshiftVersion === 3 &&
      app.spec &&
      app.spec.clusterServiceClassExternalName === DEFAULT_SERVICES.ENMASSE
    ) {
      return getDashboardUrl(app);
    }
    if (app.status.dashboardURL) {
      return app.status.dashboardURL;
    }
    if (app.metadata && app.metadata.annotations && app.metadata.annotations['integreatly/dashboard-url']) {
      return app.metadata.annotations['integreatly/dashboard-url'];
    }
    return null;
  };

  toggle = id => {
    const { expanded } = this.state;
    const index = expanded.indexOf(id);
    const newExpanded =
      index >= 0 ? [...expanded.slice(0, index), ...expanded.slice(index + 1, expanded.length)] : [...expanded, id];
    this.setState(() => ({ expanded: newExpanded }));
  };

  getOpenshiftConsole = index => (
    <li key="openshift_console_list">
      <DataList
        aria-label="OpenShift console datalist"
        key="openshift_console"
        id={`openshift-console-datalistitem-${index}`}
      >
        <DataListItem
          className="integr8ly-installed-apps-view-list-item-enabled"
          isExpanded={this.state.expanded.includes(`openshift-toggle-${index}`)}
          key={`openshift_console_${index}`}
          value={index}
          aria-labelledby={`openshift-console-datalistitem-${index}`}
          aria-label={`Openshift application list item ${index}`}
        >
          <DataListItemRow>
            <DataListToggle
              onClick={() => this.toggle(`openshift-toggle-${index}`)}
              isExpanded={this.state.expanded.includes(`openshift-toggle-${index}`)}
              id={`openshift-toggle-${index}`}
              aria-controls={`openshift-expand-${index}`}
            />
            <DataListItemCells
              dataListCells={[
                <DataListCell key="manage cluster">
                  <Button
                    className="integr8ly-app-name-pretty"
                    variant="link"
                    onClick={() => this.toggle(`openshift-toggle-${index}`)}
                  >
                    Manage cluster
                  </Button>
                </DataListCell>,
                <DataListCell className="integr8ly-pretty-name" key="primary content">
                  <span id="Red Hat OpenShift">
                    Red Hat OpenShift
                    {window.OPENSHIFT_CONFIG && window.OPENSHIFT_CONFIG.openshiftVersion === 4
                      ? ` (version ${window.OPENSHIFT_CONFIG.openshiftVersion})`
                      : ''}
                  </span>
                </DataListCell>
              ]}
            />
            <DataListAction
              id={`openshift_console_${index}_actions`}
              key="secondary content"
              aria-label={`Openshift Actions ${index}`}
              aria-labelledby={`Openshift Actions ${index}`}
            >
              <div className="integr8ly-state-ready">
                <Button
                  onClick={() => {
                    const suffix = window.OPENSHIFT_CONFIG.openshiftVersion === 4 ? 'dashboards' : 'console';
                    window.open(`${window.OPENSHIFT_CONFIG.openshiftHost}/${suffix}`, '_blank');
                  }}
                  variant="secondary"
                >
                  Open console
                </Button>
              </div>
            </DataListAction>
          </DataListItemRow>
          <DataListContent
            aria-label={`Openshift Content Details ${index}`}
            className="integr8ly-app-detail-content"
            id={`openshift-expand-${index}`}
            isHidden={!this.state.expanded.includes(`openshift-toggle-${index}`)}
          >
            <span>A single-tenant, high-availability OpenShift cluster, managed by Red Hat.</span>
          </DataListContent>
        </DataListItem>
      </DataList>
    </li>
  );

  createCustomAppElem = (i, customApp) => (
    <DataList aria-label="OpenShift service item" id={`openshift-service-item-${i}`}>
      <DataListItem
        className="integr8ly-installed-apps-view-list-item-enabled"
        onClick={() => window.open(`${customApp.url}`, '_blank')}
        key={`openshift_console_${i}`}
        value={i}
        aria-labelledby={`openshift-service-item-${i}`}
      >
        <DataListItemRow>
          <DataListItemCells
            dataListCells={[
              <DataListCell key={`primary content ${i}`}>
                {customApp.name}
                <Badge isRead className="pf-u-ml-lg">
                  custom
                </Badge>
              </DataListCell>,
              <DataListCell key="secondary content" className="pf-u-text-align-right">
                <div className="integr8ly-state-ready">
                  <OnRunningIcon /> &nbsp;Ready for use
                </div>
              </DataListCell>
            ]}
          />
        </DataListItemRow>
      </DataListItem>
    </DataList>
  );

  handleLaunchClicked = svc => {
    if (svc.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
      this.props.handleLaunch(svc.name);
      return;
    }
    this.props.handleLaunch(svc.spec.clusterServiceClassExternalName);
  };

  genUniqueKeyForService = svc => svc.name || svc.spec.clusterServiceClassExternalName;

  getAppVersion = app => {
    if (window.OPENSHIFT_CONFIG && window.OPENSHIFT_CONFIG.openshiftVersion === 4) {
      const key = (app.spec && app.spec.clusterServiceClassExternalName) || app.name;
      const service = window.OPENSHIFT_CONFIG.provisionedServices[key];
      if (!service) {
        return '';
      }

      const version = service.Version;
      if (!version) {
        return '';
      }
      return ` (version ${version})`;
    }
    return '';
  };

  createMasterList = (displayServices, apps, customApps, enableLaunch, launchHandler) => {
    const completeSvcNames = apps
      .map(svc => {
        if (svc.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
          return svc.name;
        }
        if (!svc.spec || !svc.spec.clusterServiceClassExternalName) {
          return null;
        }
        return svc.spec.clusterServiceClassExternalName;
      })
      .filter(svcName => !!svcName)
      .concat(displayServices);

    const completeSvcList = [...new Set(completeSvcNames)].map(svcName => {
      const provisionedSvc = apps.find(svc => {
        // Allow for non-Service Instance services.
        if (svc.type === SERVICE_TYPES.PROVISIONED_SERVICE) {
          return svc.name === svcName;
        }
        return svc.spec.clusterServiceClassExternalName === svcName;
      });
      if (!provisionedSvc) {
        return {
          spec: {
            clusterServiceClassExternalName: svcName
          },
          status: {
            dashboardURL: null
          }
        };
      }
      return provisionedSvc;
    });
    // Sort by order of products in json file
    const masterList = completeSvcList
      .sort((cur, next) => {
        const curOrder = getServiceSortOrder(cur);
        const nextOrder = getServiceSortOrder(next);
        if (!curOrder || nextOrder > curOrder) {
          return -1;
        }
        if (!nextOrder || curOrder > nextOrder) {
          return 1;
        }
        return 0;
      })
      .map((app, index) => {
        const { description, gaStatus, hidden, prettyName, primaryTask } = getProductDetails(app);
        const appVersion = this.getAppVersion(app);
        const uniqKey = this.genUniqueKeyForService(app);

        return hidden ? null : (
          <li key={uniqKey}>
            <DataList
              aria-label="Cluster service datalist"
              key={`${
                app.type === SERVICE_TYPES.PROVISIONED_SERVICE ? app.name : app.spec.clusterServiceClassExternalName
              }`}
              id={`cluster-service-datalist-item-${index}`}
            >
              <DataListItem
                className={
                  this.isServiceProvisioned(app) ? 'integr8ly-installed-apps-view-list-item-enabled' : '&nbsp;'
                }
                isExpanded={this.state.expanded.includes(`app-toggle-${index}`)}
                key={`${uniqKey}_${index}`}
                value={index}
                id={`list-item-${index}`}
                aria-labelledby={`cluster-service-datalist-item-${index}`}
                aria-label={`Installed application list item ${index}`}
              >
                <DataListItemRow className="integr8ly-installed-apps-row">
                  <DataListToggle
                    onClick={() => this.toggle(`app-toggle-${index}`)}
                    isExpanded={this.state.expanded.includes(`app-toggle-${index}`)}
                    id={`app-toggle-${index}`}
                    aria-controls={`app-expand-${index}`}
                  />
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key={`primary content ${index}`}>
                        <Button
                          className="integr8ly-app-name-pretty"
                          variant="link"
                          onClick={() => this.toggle(`app-toggle-${index}`)}
                        >
                          {primaryTask}
                        </Button>
                      </DataListCell>,
                      <DataListCell key="primary content">
                        <span className="integr8ly-pretty-name" id={`appName-${prettyName}`}>
                          {' '}
                          {prettyName} {appVersion}
                          {gaStatus && (gaStatus === 'preview' || gaStatus === 'community') ? (
                            <Badge isRead className="pf-u-ml-lg">
                              {gaStatus}
                            </Badge>
                          ) : (
                            <span />
                          )}
                        </span>
                      </DataListCell>
                    ]}
                  />
                  <DataListAction
                    id={`integration_app_${index}_actions`}
                    key="secondary content"
                    aria-label={`App Actions ${index}`}
                    aria-labelledby={`App Actions ${index}`}
                  >
                    <div className="integr8ly-state-ready">{this.getStatusForApp(app, prettyName)}</div>
                    {enableLaunch && this.isServiceUnready(app) ? (
                      <div className="integr8ly-state-provisioning">
                        <Button onClick={() => launchHandler(app)} variant="secondary">
                          <OffIcon />
                          &nbsp; Start service
                        </Button>
                      </div>
                    ) : null}
                  </DataListAction>
                </DataListItemRow>
                <DataListContent
                  aria-label={`App Content Details ${index}`}
                  className="integr8ly-app-detail-content"
                  id={`app-expand-${index}`}
                  isHidden={!this.state.expanded.includes(`app-toggle-${index}`)}
                >
                  {description}
                </DataListContent>
              </DataListItem>
            </DataList>
          </li>
        );
      })
      .filter(app => app != null);
    masterList.unshift(this.getOpenshiftConsole(masterList.length));
    if (customApps) {
      customApps.forEach(app => masterList.push(this.createCustomAppElem(masterList.length, app)));
    }
    return <ul className="integr8ly-installed-apps-view-list pf-u-p-0">{masterList}</ul>;
  };

  render() {
    const appList = this.createMasterList(
      this.props.showUnready,
      this.props.apps,
      this.props.customApps,
      this.props.enableLaunch,
      this.handleLaunchClicked.bind(this)
    );
    const managedTooltip = 'Managed services are delivered as a hosted service and supported by Red Hat.';
    const selfManagedTooltip = 'Self-managed services are available for use, but not managed by Red Hat.';

    return (
      <div>
        <div className="integr8ly-tutorial-dashboard-title pf-l-flex pf-u-py-sm">
          <span className="pf-l-flex pf-m-inline-flex">
            <h2 className="pf-c-title pf-m-3xl pf-u-mt-sm pf-u-mb-sm">
              {window.OPENSHIFT_CONFIG &&
              (window.OPENSHIFT_CONFIG.openshiftVersion === 3 ||
                (window.OPENSHIFT_CONFIG.installationType === 'workshop' ||
                  window.OPENSHIFT_CONFIG.installationType === 'managed'))
                ? 'Managed services'
                : 'Self-managed services'}
            </h2>
            <Tooltip
              position="top"
              content={
                <div>
                  {window.OPENSHIFT_CONFIG &&
                  (window.OPENSHIFT_CONFIG.openshiftVersion === 3 ||
                    (window.OPENSHIFT_CONFIG.installationType === 'workshop' ||
                      window.OPENSHIFT_CONFIG.installationType === 'managed'))
                    ? managedTooltip
                    : selfManagedTooltip}
                </div>
              }
            >
              <span>
                <HelpIcon className="integr8ly-dev-resources-icon" />
              </span>
            </Tooltip>
          </span>

          <div className="pf-l-flex__item pf-m-align-right">
            <Badge className="integr8ly-dash-badge" isRead>
              {appList.props.children.length}
            </Badge>{' '}
          </div>
        </div>
        <div className="integr8ly-installed-apps-view pf-u-mb-0">
          <div className="integr8ly-installed-apps-view-panel-title pf-u-display-flex pf-u-align-items-center pf-u-mt-sm pf-u-box-shadow-md" />
          {appList}
        </div>
        {/* 
        <div className="integr8ly-tutorial-dashboard-title pf-l-flex pf-u-py-sm">
          <span className="pf-l-flex pf-m-inline-flex">
            <h2 className="pf-c-title pf-m-3xl pf-u-mt-sm pf-u-mb-sm">Self-managed services</h2>
            <Tooltip position="top" content={<div>{selfManagedTooltip}</div>}>
              <span>
                <HelpIcon className="pf-u-mt-sm integr8ly-dev-resources-icon" />
              </span>
            </Tooltip>
          </span>

          <div className="pf-l-flex__item pf-m-align-right">
            <Badge className="integr8ly-dash-badge" isRead>
              0
            </Badge>{' '}
          </div>
        </div>
        <div className="integr8ly-installed-apps-view pf-u-mb-0">
          <div className="integr8ly-installed-apps-view-panel-title pf-u-display-flex pf-u-align-items-center pf-u-mt-sm pf-u-box-shadow-md" />
          {appList}
        </div> 
        */}
      </div>
    );
  }
}

InstalledAppsView.propTypes = {
  apps: PropTypes.arrayOf(
    PropTypes.shape({
      appName: PropTypes.string,
      appIcon: PropTypes.string
    })
  ).isRequired,
  customApps: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      url: PropTypes.string
    })
  ).isRequired,
  showUnready: PropTypes.array,
  handleLaunch: PropTypes.func.isRequired,
  enableLaunch: PropTypes.bool,
  username: PropTypes.string,
  openshiftHost: PropTypes.string
};

InstalledAppsView.defaultProps = {
  showUnready: [],
  enableLaunch: true,
  username: '',
  openshiftHost: ''
};

export default InstalledAppsView;
