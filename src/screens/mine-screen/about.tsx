/* tslint:disable:no-any */
import { List, Picker, Toast, Portal } from "@ant-design/react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Switch, View } from "react-native";
import { connect } from "react-redux";
import { analytics } from "@/common/analytics";
import { ListHeader } from "@/common/list-header";
import { registerForPushNotificationAsync } from "@/common/register-push-token";
import { actionUpdateReduxState } from "@/common/root-reducer";
import { AppState } from "@/common/store";
import { setTheme, theme } from "@/common/theme";
import { i18n } from "@/translations";
import { ScreenProps } from "@/types/screen-props";
import { AccountHeader } from "@/screens/mine-screen/account-header";
import { actionLogout } from "@/screens/mine-screen/account-reducer";
import { useUserProfile } from "@/screens/mine-screen/hooks/use-user-profile";
import { useUpdateReportSubscribeToRemote } from "@/screens/mine-screen/hooks/use-update-report-subscribe";
import { useFeatureFlags } from "@/common/feature-flags/use-feature-flags";
import { ReportStatus } from "../../../__generated__/globalTypes";

const { Item } = List;
const { Brief } = Item;

type Props = {
  authToken: string;
  locale: string;
  logout: (authToken: string) => void;
  updateReduxState: (state: {
    base: { locale?: string; currentTheme?: string };
  }) => void;
  screenProps: ScreenProps;
  currentTheme: "dark" | "light";
  userId: string;
  fromAnnouncement: boolean;
};

export const About = connect(
  (state: AppState) => ({
    authToken: state.base.authToken,
    locale: state.base.locale,
    currentTheme: state.base.currentTheme,
    userId: state.base.userId,
  }),
  (dispatch) => ({
    logout(authToken: string): void {
      dispatch(actionLogout(authToken));
    },
    updateReduxState(payload: { base: { locale: string } }): void {
      dispatch(actionUpdateReduxState(payload));
    },
  })
)(
  ({
    authToken,
    locale,
    logout,
    updateReduxState,
    screenProps,
    currentTheme,
    userId,
    fromAnnouncement,
  }: Props) => {
    const pickerSource = [
      { value: ReportStatus.WEEKLY, label: i18n.t("weekly") },
      { value: ReportStatus.MONTHLY, label: i18n.t("monthly") },
      { value: ReportStatus.OFF, label: i18n.t("off") },
    ];

    useEffect(() => {
      async function init() {
        await analytics.track("page_view_mine", {});
        await registerForPushNotificationAsync();
      }
      init();
    }, []);

    const [reportAnimateCount, setReportAnimateCount] = useState(0);
    useEffect(() => {
      if (fromAnnouncement) {
        const interval = setInterval(() => {
          if (reportAnimateCount < 5) {
            setReportAnimateCount(reportAnimateCount + 1);
          }
        }, 300);
        return () => clearInterval(interval);
      }
      setReportAnimateCount(0);
      return undefined;
    }, [fromAnnouncement, reportAnimateCount]);

    const { emailReportStatus } = useUserProfile(userId);
    const [reportStatus, setReportStatue] = useState<string>(
      emailReportStatus ? emailReportStatus.toString() : ""
    );

    useEffect(() => {
      setReportStatue(emailReportStatus ? emailReportStatus.toString() : "");
    }, [emailReportStatus]);

    const { error, mutate } = useUpdateReportSubscribeToRemote();

    const getReportStatusLabel = (status: string) => {
      switch (status) {
        case ReportStatus.OFF:
          return i18n.t("off");
        case ReportStatus.WEEKLY:
          return i18n.t("weekly");
        case ReportStatus.MONTHLY:
          return i18n.t("monthly");
        default:
          return i18n.t("off");
      }
    };

    const getReportStatusEnum = (status: string) => {
      switch (status) {
        case ReportStatus.OFF:
          return ReportStatus.OFF;
        case ReportStatus.WEEKLY:
          return ReportStatus.WEEKLY;
        case ReportStatus.MONTHLY:
          return ReportStatus.MONTHLY;
        default:
          return ReportStatus.OFF;
      }
    };

    const renderAppSection = () => {
      const backgroundColor = {
        backgroundColor: theme.white,
        color: theme.text01,
      };

      const { spendingReportSubscription } = useFeatureFlags(userId);

      return (
        // @ts-ignore
        <List
          style={backgroundColor}
          renderHeader={<ListHeader>{i18n.t("about")}</ListHeader>}
        >
          <Item
            disabled
            extra={Platform.OS === "ios" ? "Apple Store" : "Google Play"}
            arrow="horizontal"
            style={backgroundColor}
            onPress={async () => {
              const storeUrl =
                Platform.OS === "ios"
                  ? "https://apps.apple.com/us/app/id1527950512"
                  : "https://play.google.com/store/apps/details?id=io.beancount.android";
              if (storeUrl) {
                await WebBrowser.openBrowserAsync(storeUrl);
                await analytics.track("tap_review_app", { storeUrl });
              }
            }}
          >
            {i18n.t("reviewApp")}
          </Item>

          {spendingReportSubscription && (
            <Picker
              data={pickerSource}
              cols={1}
              extra={getReportStatusLabel(reportStatus)}
              onChange={async (value) => {
                const newValue = value ? String(value[0]) : "";
                if (newValue === reportStatus) {
                  return;
                }
                setReportStatue(newValue);
                const loadingKey = Toast.loading(i18n.t("updating"));
                await mutate({
                  variables: { userId, status: getReportStatusEnum(newValue) },
                });
                Portal.remove(loadingKey);
                if (!error) {
                  Toast.success(i18n.t("updateSuccess"));
                } else {
                  console.error("failed to update report status", error);
                  Toast.fail(i18n.t("updateFailed"));
                }
              }}
            >
              <Item
                style={[
                  backgroundColor,
                  {
                    backgroundColor:
                      reportAnimateCount % 2 === 1
                        ? theme.warning
                        : theme.white,
                  },
                ]}
                arrow="horizontal"
              >
                {i18n.t("subscribe")}
              </Item>
            </Picker>
          )}

          <Item
            disabled
            style={backgroundColor}
            extra={
              <Switch
                value={String(locale).startsWith("en")}
                onValueChange={async (value) => {
                  const changeTo = value ? "en" : "zh";
                  updateReduxState({
                    base: { locale: changeTo },
                  });
                  i18n.locale = changeTo;
                  screenProps.setLocale(changeTo);
                  await analytics.track("tap_switch_language", { changeTo });
                }}
              />
            }
          >
            {i18n.t("currentLanguage")}
            <Brief>
              {String(locale).startsWith("en")
                ? i18n.t("english")
                : i18n.t("chinese")}
            </Brief>
          </Item>

          <Item
            style={backgroundColor}
            disabled
            extra={
              <Switch
                value={currentTheme === "dark"}
                onValueChange={async (value) => {
                  const mode = value ? "dark" : "light";
                  setTheme(mode);
                  updateReduxState({
                    base: { currentTheme: mode },
                  });
                  await analytics.track("tap_switch_theme", { mode });
                }}
              />
            }
          >
            {i18n.t("theme")}
            <Brief>{currentTheme === "dark" ? "Dark" : "Light"}</Brief>
          </Item>
          <Item
            style={backgroundColor}
            disabled
            extra={Constants.nativeAppVersion}
          >
            {i18n.t("currentVersion")}
          </Item>
          {authToken ? (
            <Item
              style={backgroundColor}
              disabled
              onPress={() => {
                Alert.alert(
                  "",
                  i18n.t("logoutAlertMsg"),
                  [
                    { text: i18n.t("logoutAlertCancel"), style: "cancel" },
                    {
                      text: i18n.t("logoutAlertConfirm"),
                      onPress: () => {
                        logout(authToken);
                      },
                    },
                  ],
                  { cancelable: false }
                );
              }}
            >
              {i18n.t("logout")}
            </Item>
          ) : (
            <View />
          )}
        </List>
      );
    };

    return (
      <ScrollView style={{ backgroundColor: theme.white }}>
        <AccountHeader />
        {renderAppSection()}
      </ScrollView>
    );
  }
);
