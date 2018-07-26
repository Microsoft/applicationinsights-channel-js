///<reference types="applicationinsights-core-js" />
import {
    IEnvelope, Data, Envelope,
    RemoteDependencyData, Event, Exception,
    Metric, PageView, Trace, PageViewPerformance
} from 'applicationinsights-common';
import { ITelemetryItem, CoreUtils } from 'applicationinsights-core-js';

export const ContextTagKeys: string[] = [
    "ai.application.ver",
    "ai.application.build",
    "ai.application.typeId",
    "ai.application.applicationId",
    "ai.application.layer",
    "ai.device.id",
    "ai.device.ip",
    "ai.device.language",
    "ai.device.locale",
    "ai.device.model",
    "ai.device.friendlyName",
    "ai.device.network",
    "ai.device.networkName",
    "ai.device.oemName",
    "ai.device.os",
    "ai.device.osVersion",
    "ai.device.roleInstance",
    "ai.device.roleName",
    "ai.device.screenResolution",
    "ai.device.type",
    "ai.device.machineName",
    "ai.device.vmName",
    "ai.device.browser",
    "ai.device.browserVersion",
    "ai.location.ip",
    "ai.location.country",
    "ai.location.province",
    "ai.location.city",
    "ai.operation.id",
    "ai.operation.name",
    "ai.operation.parentId",
    "ai.operation.rootId",
    "ai.operation.syntheticSource",
    "ai.operation.correlationVector",
    "ai.session.id",
    "ai.session.isFirst",
    "ai.session.isNew",
    "ai.user.accountAcquisitionDate",
    "ai.user.accountId",
    "ai.user.userAgent",
    "ai.user.id",
    "ai.user.storeRegion",
    "ai.user.authUserId",
    "ai.user.anonUserAcquisitionDate",
    "ai.user.authUserAcquisitionDate",
    "ai.cloud.name",
    "ai.cloud.role",
    "ai.cloud.roleVer",
    "ai.cloud.roleInstance",
    "ai.cloud.environment",
    "ai.cloud.location",
    "ai.cloud.deploymentUnit",
    "ai.internal.sdkVersion",
    "ai.internal.agentVersion",
    "ai.internal.nodeName",
];

// these two constants are used to filter out properties not needed when trying to extract custom properties and measurements from the incoming payload
const baseType: string = "baseType";
const baseData: string = "baseData";

export abstract class EnvelopeCreator {
    abstract Create(telemetryItem: ITelemetryItem): IEnvelope;

    protected static extractMeasurements(properties: { [key: string]: any }): { [key: string]: any } {
        let customMeasurements: { [key: string]: any } = null;
        for (let key in properties) {
            if (properties.hasOwnProperty(key) && key !== baseType && key !== baseData) {
                let value = properties[key];
                if (typeof value === "number") {
                    if (!customMeasurements) {
                        customMeasurements = {};
                    }
                    customMeasurements[key] = value;
                }
            }
        }

        return customMeasurements;
    }

    protected static extractProperties(data: { [key: string]: any }): { [key: string]: any } {
        let customProperties: { [key: string]: any } = null;
        for (let key in data) {
            if (data.hasOwnProperty(key) && key !== baseType && key !== baseData) {
                let value = data[key];
                if (typeof value !== "number") {
                    if (!customProperties) {
                        customProperties = {};
                    }
                    customProperties[key] = value;
                }
            }
        }

        return customProperties;
    }


    protected static extractPropsAndMeasurements(data: { [key: string]: any }, properties: { [key: string]: any }, measurements: { [key: string]: any }) {
        if (!CoreUtils.isNullOrUndefined(data)) {
            for (let key in data) {
                if (data.hasOwnProperty(key) && key !== baseType && key !== baseData) {
                    let value = data[key];
                    if (typeof value === "number") {
                        measurements[key] = value;
                    } else {
                        properties[key] = value;
                    }
                }
            }
        }
    }

    protected static createEnvelope<T>(envelopeType: string, telemetryItem: ITelemetryItem, data: Data<T>): IEnvelope {
        let envelope = new Envelope(data, envelopeType);
        envelope.iKey = telemetryItem.instrumentationKey;
        let iKeyNoDashes = telemetryItem.instrumentationKey.replace(/-/g, "");
        envelope.name = envelope.name.replace("{0}", iKeyNoDashes);

        // loop through the envelope ctx (Part A) and pick out the ones that should go in outgoing envelope tags
        for (let key in telemetryItem.ctx) {
            if (telemetryItem.ctx.hasOwnProperty(key)) {
                if (ContextTagKeys.indexOf(key) >= 0) {
                    envelope.tags[key] = telemetryItem.ctx[key];
                }
            }
        }

        // loop through the envelope tags (extension of Part A) and pick out the ones that should go in outgoing envelope tags
        telemetryItem.tags.forEach((tag) => {
            for (let key in tag) {
                if (tag.hasOwnProperty(key)) {
                    if (ContextTagKeys.indexOf(key) >= 0) {
                        envelope.tags[key] = tag[key];
                    }
                }
            }
        });

        return envelope;
    }
}

export class DependencyEnvelopeCreator extends EnvelopeCreator {
    static DependencyEnvelopeCreator = new DependencyEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customMeasurements = {};
        let customProperties = {};
        EnvelopeCreator.extractPropsAndMeasurements(telemetryItem.data, customProperties, customMeasurements);
        let id = telemetryItem.data.baseData.id;
        let absoluteUrl = telemetryItem.data.baseData.absoluteUrl;
        let command = telemetryItem.data.baseData.command;
        let totalTime = telemetryItem.data.baseData.totalTime;
        let success = telemetryItem.data.baseData.success;
        let resultCode = telemetryItem.data.baseData.resultCode;
        let method = telemetryItem.data.baseData.method;
        let baseData = new RemoteDependencyData(id, absoluteUrl, command, totalTime, success, resultCode, method, customProperties, customMeasurements);
        let data = new Data<RemoteDependencyData>(RemoteDependencyData.dataType, baseData);
        return EnvelopeCreator.createEnvelope<RemoteDependencyData>(RemoteDependencyData.envelopeType, telemetryItem, data);
    }
}

export class EventEnvelopeCreator extends EnvelopeCreator {
    static EventEnvelopeCreator = new EventEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customProperties = {};
        let customMeasurements = {};
        EnvelopeCreator.extractPropsAndMeasurements(telemetryItem.data, customProperties, customMeasurements);
        let eventName = telemetryItem.data.baseData.name;
        let baseData = new Event(eventName, customProperties, customMeasurements);
        let data = new Data<Event>(Event.dataType, baseData);
        return EnvelopeCreator.createEnvelope<Event>(Event.envelopeType, telemetryItem, data);
    }
}

export class ExceptionEnvelopeCreator extends EnvelopeCreator {
    static ExceptionEnvelopeCreator = new ExceptionEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customProperties = {};
        let customMeasurements = {};
        EnvelopeCreator.extractPropsAndMeasurements(telemetryItem.data, customProperties, customMeasurements);
        let exception = telemetryItem.data.baseData.exception;
        let severityLevel = telemetryItem.data.baseData.severityLevel;
        let baseData = new Exception(exception, customProperties, customMeasurements, severityLevel);
        let data = new Data<Exception>(Exception.dataType, baseData);
        return EnvelopeCreator.createEnvelope<Exception>(Exception.envelopeType, telemetryItem, data);
    }
}

export class MetricEnvelopeCreator extends EnvelopeCreator {
    static MetricEnvelopeCreator = new MetricEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customProperties = EnvelopeCreator.extractProperties(telemetryItem.data);
        let name = telemetryItem.data.baseData.name;
        let average = telemetryItem.data.baseData.average;
        let sampleCount = telemetryItem.data.baseData.sampleCount;
        let min = telemetryItem.data.baseData.min;
        let max = telemetryItem.data.baseData.max;
        let baseData = new Metric(name, average, sampleCount, min, max, customProperties);
        let data = new Data<Metric>(Metric.dataType, baseData);
        return EnvelopeCreator.createEnvelope<Metric>(Metric.envelopeType, telemetryItem, data);
    }
}

export class PageViewEnvelopeCreator extends EnvelopeCreator {
    static PageViewEnvelopeCreator = new PageViewEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customProperties = {};
        let customMeasurements = {};
        EnvelopeCreator.extractPropsAndMeasurements(telemetryItem.data, customProperties, customMeasurements);
        let name = telemetryItem.data.baseData.name;
        let url = telemetryItem.data.baseData.uri;
        let duration = telemetryItem.data.baseData.duration;

        // refUri is a field that Breeze still does not recognize as part of Part B. For now, put it in Part C until it supports it as a domain property
        if (!CoreUtils.isNullOrUndefined(telemetryItem.data.baseData.refUri)) {
            customProperties["refUri"] = telemetryItem.data.baseData.refUri;
        }

        // pageType is a field that Breeze still does not recognize as part of Part B. For now, put it in Part C until it supports it as a domain property
        if (!CoreUtils.isNullOrUndefined(telemetryItem.data.baseData.pageType)) {
            customProperties["pageType"] = telemetryItem.data.baseData.pageType;
        }

        // isLoggedIn is a field that Breeze still does not recognize as part of Part B. For now, put it in Part C until it supports it as a domain property
        if (!CoreUtils.isNullOrUndefined(telemetryItem.data.baseData.isLoggedIn)) {
            customProperties["isLoggedIn"] = telemetryItem.data.baseData.isLoggedIn;
        }

        // pageTags is a field that Breeze still does not recognize as part of Part B. For now, put it in Part C until it supports it as a domain property
        if (!CoreUtils.isNullOrUndefined(telemetryItem.data.baseData.pageTags)) {
            let pageTags = telemetryItem.data.baseData.pageTags;
            for (let key in pageTags) {
                if (pageTags.hasOwnProperty(key)) {
                    customProperties[key] = pageTags[key];
                }
            }
        }

        let baseData = new PageView(name, url, duration, customProperties, customMeasurements);
        let data = new Data<PageView>(PageView.dataType, baseData);
        return EnvelopeCreator.createEnvelope<PageView>(PageView.envelopeType, telemetryItem, data);
    }
}

export class PageViewPerformanceEnvelopeCreator extends EnvelopeCreator {
    static PageViewPerformanceEnvelopeCreator = new PageViewPerformanceEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let customProperties = {};
        let customMeasurements = {};
        EnvelopeCreator.extractPropsAndMeasurements(telemetryItem.data, customProperties, customMeasurements);
        let name = telemetryItem.data.baseData.name;
        let url = telemetryItem.data.baseData.uri;
        let duration = telemetryItem.data.baseData.duration;
        let baseData = new PageViewPerformance(name, url, duration, customProperties, customMeasurements);
        let data = new Data<PageViewPerformance>(PageViewPerformance.dataType, baseData);
        return EnvelopeCreator.createEnvelope<PageViewPerformance>(PageViewPerformance.envelopeType, telemetryItem, data);
    }
}

export class TraceEnvelopeCreator extends EnvelopeCreator {
    static TraceEnvelopeCreator = new TraceEnvelopeCreator();

    Create(telemetryItem: ITelemetryItem): IEnvelope {
        let message = telemetryItem.data.baseData.message;
        let severityLevel = telemetryItem.data.baseData.severityLevel;
        let customProperties = EnvelopeCreator.extractProperties(telemetryItem.data);
        let baseData = new Trace(message, customProperties, severityLevel);
        let data = new Data<Trace>(Trace.dataType, baseData);
        return EnvelopeCreator.createEnvelope<Trace>(Trace.envelopeType, telemetryItem, data);
    }
}