
Sample query for the `k8s_pod_cpu_limit_utilization` which I believe is reporting nthe average at 1 minute intervals (60 seconds) if I understood correctly:

```json
{
    "start": 1750263698000,
    "end": 1750265498000,
    "step": 60,
    "variables": {},
    "compositeQuery": {
        "queryType": "builder",
        "panelType": "graph",
        "fillGaps": false,
        "builderQueries": {
            "A": {
                "dataSource": "metrics",
                "queryName": "A",
                "aggregateOperator": "avg",
                "aggregateAttribute": {
                    "key": "k8s_pod_cpu_limit_utilization",
                    "type": "Gauge",
                    "id": "k8s_pod_cpu_limit_utilization----Gauge--true",
                    "isColumn": true,
                    "isJSON": false
                },
                "timeAggregation": "avg",
                "spaceAggregation": "avg",
                "functions": [],
                "filters": {
                    "op": "AND",
                    "items": []
                },
                "expression": "A",
                "disabled": false,
                "stepInterval": 60,
                "having": [],
                "limit": null,
                "orderBy": [],
                "groupBy": [],
                "legend": "",
                "reduceTo": "avg"
            }
        }
    },
    "dataSource": "metrics"
}
```

Sample Response:
```json
{
    "status": "success",
    "data": {
        "resultType": "",
        "result": [
            {
                "queryName": "A",
                "series": [
                    {
                        "labels": {},
                        "labelsArray": null,
                        "values": [
                            {
                                "timestamp": 1750263720000,
                                "value": "0.14160210163386522"
                            },
                            {
                                "timestamp": 1750263780000,
                                "value": "0.1390037480443262"
                            },
                            {
                                "timestamp": 1750263840000,
                                "value": "0.13747627189627656"
                            },
                            {
                                "timestamp": 1750263900000,
                                "value": "0.14275863323404253"
                            },
                            {
                                "timestamp": 1750263960000,
                                "value": "0.13758547754343975"
                            },
                            {
                                "timestamp": 1750264020000,
                                "value": "0.1448779325664894"
                            },
                            {
                                "timestamp": 1750264080000,
                                "value": "0.1355719330842199"
                            },
                            {
                                "timestamp": 1750264140000,
                                "value": "0.13170723726773045"
                            },
                            {
                                "timestamp": 1750264200000,
                                "value": "0.14739095125797866"
                            },
                            {
                                "timestamp": 1750264260000,
                                "value": "0.14648740322517725"
                            },
                            {
                                "timestamp": 1750264320000,
                                "value": "0.1443826313741135"
                            },
                            {
                                "timestamp": 1750264380000,
                                "value": "0.13971424808333335"
                            },
                            {
                                "timestamp": 1750264440000,
                                "value": "0.14179400495567374"
                            },
                            {
                                "timestamp": 1750264500000,
                                "value": "0.140502544108156"
                            },
                            {
                                "timestamp": 1750264560000,
                                "value": "0.1458792545496454"
                            },
                            {
                                "timestamp": 1750264620000,
                                "value": "0.14337967739095747"
                            },
                            {
                                "timestamp": 1750264680000,
                                "value": "0.14100059476241136"
                            },
                            {
                                "timestamp": 1750264740000,
                                "value": "0.1341364347783688"
                            },
                            {
                                "timestamp": 1750264800000,
                                "value": "0.13791633007446807"
                            },
                            {
                                "timestamp": 1750264860000,
                                "value": "0.14505878567553193"
                            },
                            {
                                "timestamp": 1750264920000,
                                "value": "0.143887240679078"
                            },
                            {
                                "timestamp": 1750264980000,
                                "value": "0.15978752198315602"
                            },
                            {
                                "timestamp": 1750265040000,
                                "value": "0.14685664057624115"
                            },
                            {
                                "timestamp": 1750265100000,
                                "value": "0.1721044287615248"
                            },
                            {
                                "timestamp": 1750265160000,
                                "value": "0.16431304643528372"
                            },
                            {
                                "timestamp": 1750265220000,
                                "value": "0.1523833019335106"
                            },
                            {
                                "timestamp": 1750265280000,
                                "value": "0.15905940156117024"
                            },
                            {
                                "timestamp": 1750265340000,
                                "value": "0.1339238632570922"
                            },
                            {
                                "timestamp": 1750265400000,
                                "value": "0.1443227880859929"
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
```


Note that the query is NOT breaking down the metric by any of the reported attributes above so it's just an overall average across all metric attributes. 

So we would usually need to break it down by some attribute. 

For example, here's one of the queries from the built-in Signoz Infrastructure dashboard which is looking at the `stio-api` deployment and shows the CPU usage, request, and limits:

Keep in mind that `k8s_pod_cpu_utilization` is in CORES

```json
{
    "start": 1750230079000,
    "end": 1750266079000,
    "step": 120,
    "variables": {},
    "formatForWeb": false,
    "compositeQuery": {
        "queryType": "builder",
        "panelType": "graph",
        "fillGaps": false,
        "builderQueries": {
            "A": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "A",
                "filters": {
                    "items": [
                        {
                            "id": "aec60cba",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_deployment_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_deployment_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "usage",
                "limit": null,
                "orderBy": [],
                "queryName": "A",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            },
            "B": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_container_cpu_request--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_container_cpu_request",
                    "type": "Gauge"
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "B",
                "filters": {
                    "items": [
                        {
                            "id": "d047ec14",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "contains",
                            "value": "stio-api"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "requests",
                "limit": null,
                "orderBy": [],
                "queryName": "B",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            },
            "C": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_container_cpu_limit--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_container_cpu_limit",
                    "type": "Gauge"
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "C",
                "filters": {
                    "items": [
                        {
                            "id": "750b7856",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "contains",
                            "value": "stio-api"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "limits",
                "limit": null,
                "orderBy": [],
                "queryName": "C",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            }
        }
    }
}
```



If we wanted **percentage** utilization, we could use another metric like one of the following against the Kubernetes Resource Request and Limit values:
- `k8s_pod_cpu_request_utilization` 
- `k8s_pod_cpu_limit_utilization`

Those could also be combined with `min` or `max` `aggregateOperator` values instead of `avg`. For example, the Signoz Infrastructure built-in interface uses a query like the following for showing the values for a particular pod.

```json
{
    "start": 1750230199000,
    "end": 1750266199000,
    "step": 120,
    "variables": {},
    "formatForWeb": false,
    "compositeQuery": {
        "queryType": "builder",
        "panelType": "graph",
        "fillGaps": false,
        "builderQueries": {
            "A": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_request_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_request_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "A",
                "filters": {
                    "items": [
                        {
                            "id": "2ea54c80",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "755c8a9d",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Request util % - Avg",
                "limit": null,
                "orderBy": [],
                "queryName": "A",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            },
            "B": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_limit_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_limit_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "B",
                "filters": {
                    "items": [
                        {
                            "id": "7243d538",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "1e3d01ee",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Limit util % - Avg",
                "limit": null,
                "orderBy": [],
                "queryName": "B",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            },
            "C": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_request_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_request_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "max",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "C",
                "filters": {
                    "items": [
                        {
                            "id": "3ec4e2b6",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "0c8b2662",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Request util % - Max",
                "limit": null,
                "orderBy": [],
                "queryName": "C",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "max"
            },
            "D": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_request_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_request_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "min",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "D",
                "filters": {
                    "items": [
                        {
                            "id": "abe996ed",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "e915da76",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Request util % - Min",
                "limit": null,
                "orderBy": [],
                "queryName": "D",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "min"
            },
            "E": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_limit_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_limit_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "max",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "E",
                "filters": {
                    "items": [
                        {
                            "id": "3addc70a",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "32c15c03",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Limit util % - Max",
                "limit": null,
                "orderBy": [],
                "queryName": "E",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "max"
            },
            "F": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_limit_utilization--float64--Gauge--true",
                    "isColumn": true,
                    "isJSON": false,
                    "key": "k8s_pod_cpu_limit_utilization",
                    "type": "Gauge"
                },
                "aggregateOperator": "min",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "F",
                "filters": {
                    "items": [
                        {
                            "id": "da9de2a8",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "default"
                        },
                        {
                            "id": "703fced1",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_pod_name--string--tag--false",
                                "isColumn": false,
                                "isJSON": false,
                                "key": "k8s_pod_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "stio-api-85c6cc7d76-vnzmg"
                        }
                    ],
                    "op": "AND"
                },
                "functions": [],
                "groupBy": [],
                "having": [],
                "legend": "Limit util % - Min",
                "limit": null,
                "orderBy": [],
                "queryName": "F",
                "reduceTo": "avg",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "min"
            }
        }
    }
}
```


Other interesting attributes include:

- `k8s_pod_memory_usage` (in bytes) 
- `k8s_pod_memory_request_utilization` (percent as 0-1)
- `k8s_pod_memory_limit_utilization` (percent as 0-1)
- `k8s_pod_memory_rss`  (bytes)
- `k8s_pod_memory_working_set` (bytes)
- `k8s_pod_memory_major_page_faults`

Cache memory can be calculated using the RSS and Working Set as the difference:
```json
{
    "disabled": false,
    "expression": "B-A",
    "legend": "Cache Memory",
    "queryName": "F1"
}
```


## Grouping and Labeling
Another example showing grouping and labeling. 

This example also uses Signoz Variables since it's on a dashboard where the user could select different variables from dropdowns to dynamically filter what's displayed, but we could simplify that in our query builder for dynamic injection directly into the query as needed:
```json
{
    "start": 1750265149000,
    "end": 1750266949000,
    "step": 60,
    "variables": {
        "SIGNOZ_START_TIME": 1750265149000,
        "SIGNOZ_END_TIME": 1750266949000,
        "k8s_node_name": [
            "cp1",
            "cp2",
            "cp3",
            "default-pool-22b5bcce7f3461ea",
            "default-pool-74d89f15a4f95d13",
            "default-pool-7c9e5f6e5e62dfde",
            "dynamic-pool-13eb63422c4f29f2",
            "dynamic-pool-17a73b04b61188fb",
            "dynamic-pool-248034ecd177430e",
            "dynamic-pool-3e566448e4b9c14b",
            "dynamic-pool-3f901b6933e7150e",
            "dynamic-pool-413e67d2b9aa6dd8",
            "dynamic-pool-475c487de6a51896",
            "dynamic-pool-4cac8bab507e4b26",
            "dynamic-pool-524f115afaea9c01",
            "dynamic-pool-5850c41c9ac15b10",
            "dynamic-pool-66ac9e44740883c1",
            "dynamic-pool-6bf2f1d8e90dcc08",
            "dynamic-pool-7286bd8ae36e22e8",
            "dynamic-pool-742969644cb4470f",
            "dynamic-pool-75310626c72c0cca",
            "dynamic-pool-7ca8b55ad9aa7b51",
            "dynamic-pool-8bb1784c012e394",
            "dynamic-pool-91c637512d06963",
            "dynamic-pool-c6398abcc08dce"
        ],
        "k8s_cluster_name": "he-prod",
        "k8s_namespace_name": "default"
    },
    "formatForWeb": false,
    "compositeQuery": {
        "queryType": "builder",
        "panelType": "graph",
        "fillGaps": false,
        "builderQueries": {
            "A": {
                "aggregateAttribute": {
                    "dataType": "float64",
                    "id": "k8s_pod_cpu_utilization--float64----true",
                    "isColumn": true,
                    "key": "k8s_pod_cpu_utilization",
                    "type": ""
                },
                "aggregateOperator": "avg",
                "dataSource": "metrics",
                "disabled": false,
                "expression": "A",
                "filters": {
                    "items": [
                        {
                            "id": "9a0ffaf3",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_cluster_name--string--tag--false",
                                "isColumn": false,
                                "key": "k8s_cluster_name",
                                "type": "tag"
                            },
                            "op": "=",
                            "value": "{{.k8s_cluster_name}}"
                        },
                        {
                            "id": "9a0ffaf3",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_node_name--string--tag--false",
                                "isColumn": false,
                                "key": "k8s_node_name",
                                "type": "tag"
                            },
                            "op": "in",
                            "value": [
                                "{{.k8s_node_name}}"
                            ]
                        },
                        {
                            "id": "b5db2e8e",
                            "key": {
                                "dataType": "string",
                                "id": "k8s_namespace_name--string--tag--false",
                                "isColumn": false,
                                "key": "k8s_namespace_name",
                                "type": "tag"
                            },
                            "op": "in",
                            "value": [
                                "{{.k8s_namespace_name}}"
                            ]
                        }
                    ],
                    "op": "AND"
                },
                "groupBy": [
                    {
                        "dataType": "string",
                        "id": "k8s_node_name--string--tag--false",
                        "isColumn": false,
                        "key": "k8s_node_name",
                        "type": "tag"
                    },
                    {
                        "dataType": "string",
                        "id": "k8s_namespace_name--string--tag--false",
                        "isColumn": false,
                        "key": "k8s_namespace_name",
                        "type": "tag"
                    },
                    {
                        "dataType": "string",
                        "id": "k8s_pod_name--string--tag--false",
                        "isColumn": false,
                        "key": "k8s_pod_name",
                        "type": "tag"
                    }
                ],
                "having": [],
                "legend": "{{k8s_namespace_name}}-{{k8s_pod_name}}",
                "limit": null,
                "orderBy": [],
                "queryName": "A",
                "reduceTo": "sum",
                "spaceAggregation": "sum",
                "stepInterval": 60,
                "timeAggregation": "avg"
            }
        }
    }
}
```