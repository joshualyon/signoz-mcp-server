When I opened the metrics viewer in the Signoz UI, I watched the process and it seems like the following happens:


## Metrics List 
Query to an internal /api/v1/metrics endpoint to get the list of metrics and some high-level information about them:
```log
POST http://localhost:8081/api/v1/metrics
{
    "filters": {
        "items": [],
        "op": "AND"
    },
    "orderBy": {
        "columnName": "samples",
        "order": "desc"
    },
    "limit": 10,
    "offset": 0,
    "start": 1750254821723,
    "end": 1750258421723
}
```

Sample Response
```log
{
    "status": "success",
    "data": {
        "metrics": [
            {
                "metric_name": "apisix_http_status",
                "description": "HTTP status codes per service in APISIX",
                "type": "Sum",
                "unit": "",
                "timeseries": 15689,
                "samples": 7530720,
                "lastReceived": 0
            },
            {
                "metric_name": "apisix_http_latency_count",
                "description": "HTTP request latency in milliseconds per service in APISIX",
                "type": "Sum",
                "unit": "1",
                "timeseries": 8571,
                "samples": 4114080,
                "lastReceived": 0
            },
            {
                "metric_name": "apisix_http_latency_sum",
                "description": "HTTP request latency in milliseconds per service in APISIX",
                "type": "Sum",
                "unit": "",
                "timeseries": 8562,
                "samples": 4109760,
                "lastReceived": 0
            },
            {
                "metric_name": "apisix_bandwidth",
                "description": "Total bandwidth in bytes consumed per service in APISIX",
                "type": "Sum",
                "unit": "",
                "timeseries": 5845,
                "samples": 2805600,
                "lastReceived": 0
            },
            ...
        ]
    }
}
```

## Treemap
Query to an internal /api/v1/metrics/treemap endpoint to get a relative idea of how much storage each metric is taking up (not relevant for our current needs) 
```log
POST http://localhost:8081/api/v1/metrics/treemap
{
    "limit": 100,
    "filters": {
        "items": [],
        "op": "AND"
    },
    "treemap": "timeseries",
    "start": 1750254821723,
    "end": 1750258421723
}
```

Sample response:
```json
{
    "status": "success",
    "data": {
        "timeseries": [
            {
                "percentage": 28.779098978395577,
                "total_value": 34368,
                "metric_name": "http_client_duration_bucket"
            },
            {
                "percentage": 13.47847931669737,
                "total_value": 16096,
                "metric_name": "http_server_duration_bucket"
            },
            ...
        ],
        "samples": null
    }
}
```


On the server side, the following queries were fired between the two /metrics and /metrics/treemap endpoints being hit and it may surface clues on the underlying Clickhouse queries that were used to fulfil each of these API requests. 

```log
2025.06.18 14:53:04.222774 [ 88278 ] {f3173126-0b50-4bff-9578-b31a89e9e696} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:34718, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT t.metric_name AS metric_name, ANY_VALUE(t.description) AS description, ANY_VALUE(t.type) AS metric_type, ANY_VALUE(t.unit) AS metric_unit, uniq(t.fingerprint) AS timeseri
es, uniq(metric_name) OVER() AS total FROM signoz_metrics.distributed_time_series_v4 AS t WHERE unix_milli BETWEEN 1750251600000 AND 1750258384133 AND NOT startsWith(metric_name, 'signoz_') AND __normalized = true GROUP BY t.metric_name ORDER BY timeserie
s desc LIMIT 50 OFFSET 0; (stage: Complete)
2025.06.18 14:53:04.229530 [ 88077 ] {bded9e12-ac58-4bdb-9531-ca4bea90adab} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:56436, initial_query_id: f3173126-0b50-4bff-9578-b31a89e9e696) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT `__table1`.`metric_name` AS `metric_name`, any(`__table1`.`description`) AS `description`, any(`__table1`.`type`) AS `metric_type`,
 any(`__table1`.`unit`) AS `metric_unit`, uniq(`__table1`.`fingerprint`) AS `timeseries`, uniq(`__table1`.`metric_name`) OVER () AS `total` FROM `signoz_metrics`.`time_series_v4` AS `__table1` WHERE ((`__table1`.`unix_milli` >= 1750251600000) AND (`__tabl
e1`.`unix_milli` <= 1750258384133)) AND (NOT startsWith(`__table1`.`metric_name`, 'signoz_')) AND (`__table1`.`__normalized` = _CAST(true, 'Bool')) GROUP BY `__table1`.`metric_name` ORDER BY uniq(`__table1`.`fingerprint`) DESC LIMIT _CAST(0, 'UInt64'), _C
AST(50, 'UInt64') (stage: Complete)
2025.06.18 14:53:04.587738 [ 88307 ] {0b651a38-18e9-49ab-94cd-8501d0eafcfc} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:43766, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT metric_name, type, description, temporality, is_monotonic, unit FROM signoz_metrics.distributed_updated_metadata WHERE metric_name IN ('http_client_duration_bucket', 'htt
p_server_duration_bucket', 'apisix_http_status', 'http_client_request_duration_bucket', 'apisix_http_latency_count', 'apisix_http_latency_sum', 'apisix_bandwidth', 'http_client_duration_sum', 'http_client_duration_count', 'http_server_duration_count', 'ht
tp_server_duration_sum', 'http_client_request_duration_count', 'http_client_request_duration_sum', 'system_cpu_time', 'k8s_volume_inodes_used', 'k8s_volume_capacity', 'k8s_volume_available', 'k8s_volume_inodes', 'k8s_volume_inodes_free', 'k8s_pod_network_
errors', 'k8s_pod_network_io', 'k8s_container_restarts', 'k8s_container_ready', 'container_cpu_usage', 'container_uptime', 'container_filesystem_usage', 'container_cpu_utilization', 'container_filesystem_available', 'container_memory_usage', 'container_fi
lesystem_capacity', 'container_memory_major_page_faults', 'container_memory_page_faults', 'container_memory_working_set', 'container_cpu_time', 'container_memory_rss', 'v8js_gc_duration_bucket', 'k8s_pod_status_reason', 'k8s_pod_phase', 'k8s_container_mem
ory_request', 'k8s_container_cpu_request_utilization', 'k8s_container_memory_request_utilization', 'k8s_container_cpu_request', 'k8s_pod_memory_working_set', 'k8s_pod_cpu_utilization', 'k8s_pod_memory_rss', 'k8s_pod_filesystem_capacity', 'k8s_pod_uptime',
 'k8s_pod_cpu_usage', 'k8s_pod_memory_page_faults', 'k8s_pod_filesystem_available'); (stage: Complete)
2025.06.18 14:53:04.591766 [ 88077 ] {0d48dc8a-8153-4478-85dd-7f1de6759ad1} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:56436, initial_query_id: 0b651a38-18e9-49ab-94cd-8501d0eafcfc) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT `__table1`.`metric_name` AS `metric_name`, `__table1`.`type` AS `type`, `__table1`.`description` AS `description`, `__table1`.`temp
orality` AS `temporality`, `__table1`.`is_monotonic` AS `is_monotonic`, `__table1`.`unit` AS `unit` FROM `signoz_metrics`.`updated_metadata` AS `__table1` WHERE `__table1`.`metric_name` IN ('http_client_duration_bucket', 'http_server_duration_bucket', 'ap
isix_http_status', 'http_client_request_duration_bucket', 'apisix_http_latency_count', 'apisix_http_latency_sum', 'apisix_bandwidth', 'http_client_duration_sum', 'http_client_duration_count', 'http_server_duration_count', 'http_server_duration_sum', 'http
_client_request_duration_count', 'http_client_request_duration_sum', 'system_cpu_time', 'k8s_volume_inodes_used', 'k8s_volume_capacity', 'k8s_volume_available', 'k8s_volume_inodes', 'k8s_volume_inodes_free', 'k8s_pod_network_errors', 'k8s_pod_network_io',
 'k8s_container_restarts', 'k8s_container_ready', 'container_cpu_usage', 'container_uptime', 'container_filesystem_usage', 'container_cpu_utilization', 'container_filesystem_available', 'container_memory_usage', 'container_filesystem_capacity', 'container
_memory_major_page_faults', 'container_memory_page_faults', 'container_memory_working_set', 'container_cpu_time', 'container_memory_rss', 'v8js_gc_duration_bucket', 'k8s_pod_status_reason', 'k8s_pod_phase', 'k8s_container_memory_request', 'k8s_container_c
pu_request_utilization', 'k8s_container_memory_request_utilization', 'k8s_container_cpu_request', 'k8s_pod_memory_working_set', 'k8s_pod_cpu_utilization', 'k8s_pod_memory_rss', 'k8s_pod_filesystem_capacity', 'k8s_pod_uptime', 'k8s_pod_cpu_usage', 'k8s_pod
_memory_page_faults', 'k8s_pod_filesystem_available') (stage: Complete)
```







## Metric Detail
For an individual metric, if we click on it, it calls another endpoint to get more details about that particular metric.


```json
GET http://localhost:8081/api/v1/metrics/http_client_duration_bucket/metadata
```


## Sample Response
```json
{
    "status": "success",
    "data": {
        "name": "http_client_duration_bucket",
        "description": "Measures the duration of outbound HTTP requests.",
        "type": "Histogram",
        "unit": "ms",
        "samples": 1437468928,
        "timeSeriesTotal": 617539,
        "timeSeriesActive": 34368,
        "lastReceived": 1750258732520,
        "attributes": [
            {
                "key": "net_peer_name",
                "value": [
                    "login.microsoftonline.com",
                    "p303-caldav.icloud.com",
                    "www.irishmirror.ie",
                    "api.smartthings.com",
                    "p27-caldav.icloud.com",
                    "westseattleblog.com",
                    "api.twilio.com",
                    ...
                ],
                "valueCount": 354
            },
            {
                "key": "host_name",
                "value": [
                    "stio-api-7c99f7888f-jzxtn",
                    "stio-api-7c99f7888f-nctpb",
                    "stio-api-77c664ffc4-b9dpj",
                    "stio-api-7c99f7888f-llhv4",
                    ...
                ],
                "valueCount": 240
            },
            {
                "key": "http_status_code",
                "value": [
                    "503",
                    "402",
                    "500",
                    "201",
                    "424",
                    "502",
                    "403",
                    "302",
                    "429",
                    "504",
                    "400",
                    "301",
                    "409",
                    "404",
                    "308",
                    "422",
                    "551",
                    "401",
                    "522",
                    "200",
                    "206",
                    "520"
                ],
                "valueCount": 22
            },
            {
                "key": "le",
                "value": [
                    "5",
                    "1000",
                    "10",
                    "100",
                    "750",
                    "250",
                    "0",
                    "500",
                    "5000",
                    "+Inf",
                    "7500",
                    "25",
                    "50",
                    "10000",
                    "2500",
                    "75"
                ],
                "valueCount": 16
            },
            {
                "key": "http_method",
                "value": [
                    "POST",
                    "GET",
                    "PUT",
                    "DELETE"
                ],
                "valueCount": 4
            },
            {
                "key": "net_peer_port",
                "value": [
                    "8080",
                    "8989",
                    "80",
                    "443"
                ],
                "valueCount": 4
            },
            {
                "key": "http_flavor",
                "value": [
                    "1.0",
                    "1.1"
                ],
                "valueCount": 2
            },
            {
                "key": "process_command_args",
                "value": [
                    "[\\\"/usr/local/bin/node\\\",\\\"/usr/src/app/server\\\"]",
                    "[\\\"/usr/local/bin/node\\\",\\\"/usr/src/app/index\\\"]"
                ],
                "valueCount": 2
            },
            {
                "key": "process_command",
                "value": [
                    "/usr/src/app/server",
                    "/usr/src/app/index"
                ],
                "valueCount": 2
            },
            {
                "key": "process_owner",
                "value": [
                    "root"
                ],
                "valueCount": 1
            },
            {
                "key": "process_executable_path",
                "value": [
                    "/usr/local/bin/node"
                ],
                "valueCount": 1
            },
            {
                "key": "service_name",
                "value": [
                    "stio-api"
                ],
                "valueCount": 1
            },
            {
                "key": "host_arch",
                "value": [
                    "amd64"
                ],
                "valueCount": 1
            },
            {
                "key": "process_runtime_description",
                "value": [
                    "Node.js"
                ],
                "valueCount": 1
            },
            {
                "key": "process_pid",
                "value": [
                    "1"
                ],
                "valueCount": 1
            },
            {
                "key": "process_executable_name",
                "value": [
                    "node"
                ],
                "valueCount": 1
            },
            {
                "key": "process_runtime_version",
                "value": [
                    "18.20.8"
                ],
                "valueCount": 1
            },
            {
                "key": "process_runtime_name",
                "value": [
                    "nodejs"
                ],
                "valueCount": 1
            }
        ],
        "metadata": {
            "metric_type": "Histogram",
            "description": "Measures the duration of outbound HTTP requests.",
            "unit": "ms",
            "temporality": "Cumulative",
            "monotonic": false
        },
        "alerts": null,
        "dashboards": null
    }
}
```

On the server side, it looks like the following logs fired around the time of that request likely indicating the series of Clickhouse queries that were used:
```log
2025.06.18 14:58:52.420902 [ 88318 ] {1594623e-750a-4d7e-b044-b50f8010b3c6} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:43770, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT uniq(fingerprint) AS timeSeriesCount FROM signoz_metrics.distributed_time_series_v4_1week WHERE metric_name = 'http_client_duration_bucket'; (stage: Complete)
2025.06.18 14:58:52.421192 [ 88272 ] {2b6a14cb-724a-439c-9887-23a32a79adb7} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:56404, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT uniq(fingerprint) FROM signoz_metrics.distributed_time_series_v4 WHERE metric_name = 'http_client_duration_bucket' and unix_milli >= 1750251532420 (stage: Complete)
2025.06.18 14:58:52.421713 [ 88319 ] {d16231ec-e305-4a8c-9427-721b4e5a8343} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:53584, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT MAX(unix_milli) AS last_received_time FROM signoz_metrics.samples_v4_agg_30m WHERE metric_name = 'http_client_duration_bucket'  (stage: Complete)
2025.06.18 14:58:52.423333 [ 88268 ] {78a075d1-d7d2-44e3-8de4-be6f22d99d06} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:34752, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""})  SELECT kv.1 AS key, arrayMap(x -> trim(BOTH '"' FROM x), groupUniqArray(1000)(kv.2)) AS values, length(groupUniqArray(10000)(kv.2)) AS valueCount FROM signoz_metrics.distribute
d_time_series_v4_1week ARRAY JOIN arrayFilter(x -> NOT startsWith(x.1, '__'), JSONExtractKeysAndValuesRaw(labels)) AS kv WHERE metric_name = 'http_client_duration_bucket' AND __normalized=true GROUP BY kv.1 ORDER BY valueCount DESC; (stage: Complete)
2025.06.18 14:58:52.423580 [ 88276 ] {05a299e7-eb01-4c70-bf39-0d61985713d5} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:35484, user: signoz) (comment: {"alertID":"","client":"browser","dashboardID":"","email":"user@example.com","path":"/metrics-e
xplorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT temporality, description, type, unit, is_monotonic from signoz_metrics.distributed_time_series_v4_1day WHERE metric_name='http_client_duration_bucket' AND unix_milli >= 1
750204800000 GROUP BY temporality, description, type, unit, is_monotonic (stage: Complete)
2025.06.18 14:58:52.428177 [ 88077 ] {8d49f1c5-6d45-4319-891c-d1706a7a7286} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:56436, initial_query_id: 2b6a14cb-724a-439c-9887-23a32a79adb7) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT uniq(`__table1`.`fingerprint`) AS `uniq(fingerprint)` FROM `signoz_metrics`.`time_series_v4` AS `__table1` WHERE (`__table1`.`metri
c_name` = 'http_client_duration_bucket') AND (`__table1`.`unix_milli` >= 1750251532420) (stage: Complete)
2025.06.18 14:58:52.428462 [ 88139 ] {53de0c59-cf82-472e-89f6-9b377d54a784} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:56472, initial_query_id: 05a299e7-eb01-4c70-bf39-0d61985713d5) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT `__table1`.`temporality` AS `temporality`, `__table1`.`description` AS `description`, `__table1`.`type` AS `type`, `__table1`.`unit
` AS `unit`, `__table1`.`is_monotonic` AS `is_monotonic` FROM `signoz_metrics`.`time_series_v4_1day` AS `__table1` WHERE (`__table1`.`metric_name` = 'http_client_duration_bucket') AND (`__table1`.`unix_milli` >= 1750204800000) GROUP BY `__table1`.`tempora
lity`, `__table1`.`description`, `__table1`.`type`, `__table1`.`unit`, `__table1`.`is_monotonic` (stage: Complete)
2025.06.18 14:58:52.430737 [ 87787 ] {1cc37a75-7e1c-4752-ad6c-bbc5171c3052} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:52564, initial_query_id: 1594623e-750a-4d7e-b044-b50f8010b3c6) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT uniq(`__table1`.`fingerprint`) AS `timeSeriesCount` FROM `signoz_metrics`.`time_series_v4_1week` AS `__table1` WHERE `__table1`.`me
tric_name` = 'http_client_duration_bucket' (stage: Complete)
2025.06.18 14:58:52.443530 [ 87649 ] {2c38173f-11c8-4a15-8998-543c7efaf1e7} <Debug> executeQuery: (from [::ffff:127.0.0.1[]:45244, initial_query_id: 78a075d1-d7d2-44e3-8de4-be6f22d99d06) (comment: {"alertID":"","client":"browser","dashboardID":"","email":
"user@example.com","path":"/metrics-explorer/summary","servicesTab":"","source":"metrics-explorer","viewName":""}) SELECT `__array_join_exp_1`.1 AS `key`, arrayMap(`x` -> replaceRegexpAll(`x`, _CAST('^["]+|["]+$', 'String'), ''), groupUniqArray(1000)(`_
_array_join_exp_1`.2)) AS `values`, length(groupUniqArray(10000)(`__array_join_exp_1`.2)) AS `valueCount` FROM `signoz_metrics`.`time_series_v4_1week` AS `__table2` ARRAY JOIN arrayFilter(`x` -> (NOT startsWith(`x`.1, '__')), JSONExtractKeysAndValuesRaw(`
__table2`.`labels`)) AS `__array_join_exp_1` WHERE (`__table2`.`metric_name` = 'http_client_duration_bucket') AND (`__table2`.`__normalized` = _CAST(true, 'Bool')) GROUP BY `__array_join_exp_1`.1 ORDER BY length(groupUniqArray(10000)(`__array_join_exp_1`.
2)) DESC (stage: Complete)
2025.06.18 14:58:52.451171 [ 88243 ] {7ee0b62e-3fe4-4bf1-8edf-18eb2fad44a5} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:49816, user: signoz) (comment: {"alertID":"","client":"api","dashboardID":"","email":"","path":"","servicesTab":"","source":"","
viewName":""}) SELECT 1 (stage: Complete)
2025.06.18 14:59:02.450284 [ 88286 ] {74819606-ac5f-4f91-824e-b27357d285ea} <Debug> executeQuery: (from [::ffff:10.200.4.106[]:34732, user: signoz) (comment: {"alertID":"","client":"api","dashboardID":"","email":"","path":"","servicesTab":"","source":"","
viewName":""}) SELECT 1 (stage: Complete)
```