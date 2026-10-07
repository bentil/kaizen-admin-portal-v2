import { defineConfig } from "orval";

export default defineConfig({
    org: {
        input: {
            target: "https://api.sandbox.kaizen-aceit.com/org/docs/swagger.json",
            ...(process.env.API_AUTH_TOKEN && {
                headers: {
                    Authorization: `Bearer ${process.env.API_AUTH_TOKEN}`,
                },
            }),
        },
        output: {
            mode: "tags-split",
            target: "src/lib/generated/org",
            schemas: "src/lib/generated/org/models",
            client: "react-query",
            httpClient: "axios",
            mock: false,
            override: {
                mutator: {
                    path: "./src/lib/api-client.ts",
                    name: "orgRequest",
                },
                query: {
                    useQuery: true,
                    useInfinite: false,
                    useMutation: true,
                },
            },
        },
    },
    user: {
        input: {
            target: "https://api.sandbox.kaizen-aceit.com/user/docs/swagger.json",
            ...(process.env.API_AUTH_TOKEN && {
                headers: {
                    Authorization: `Bearer ${process.env.API_AUTH_TOKEN}`,
                },
            }),
        },
        output: {
            mode: "tags-split",
            target: "src/lib/generated/user",
            schemas: "src/lib/generated/user/models",
            client: "react-query",
            httpClient: "axios",
            mock: false,
            override: {
                mutator: {
                    path: "./src/lib/api-client.ts",
                    name: "userRequest",
                },
                query: {
                    useQuery: true,
                    useInfinite: false,
                    useMutation: true,
                },
            },
        },
    },
    billing: {
        input: {
            target: "https://api.sandbox.kaizen-aceit.com/billing/docs/swagger.json",
        },
        output: {
            mode: "tags-split",
            target: "src/lib/generated/billing",
            schemas: "src/lib/generated/billing/models",
            client: "react-query",
            httpClient: "axios",
            mock: false,
            override: {
                mutator: {
                    path: "./src/lib/api-client.ts",
                    name: "billingRequest",
                },
                query: {
                    useQuery: true,
                    useInfinite: false,
                    useMutation: true,
                },
            },
        },
    },
    payment: {
        input: {
            target: "./payment-openapi.json",
        },
        output: {
            mode: "tags-split",
            target: "src/lib/generated/payment",
            schemas: "src/lib/generated/payment/models",
            client: "react-query",
            httpClient: "axios",
            mock: false,
            override: {
                mutator: {
                    path: "./src/lib/api-client.ts",
                    name: "paymentRequest",
                },
                query: {
                    useQuery: true,
                    useInfinite: false,
                    useMutation: true,
                },
            },
        },
    },
});
