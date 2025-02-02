import type { AxiosRequestConfig, Method } from "axios";
import axios from "axios";
import type { Adapter, AdapterResponse } from "../adapter";
import { AdapterError } from "../adapter";
import { ClientOptions } from "../clientOptions";

export class AxiosAdapter<TResource> implements Adapter<TResource> {
    public async execute(options: ClientOptions): Promise<AdapterResponse<TResource>> {
        try {
            const config: AxiosRequestConfig = {
                httpsAgent: options.configuration.httpsAgent,
                url: options.url,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                method: options.method as Method,
                data: options.requestBody,
                headers: {
                    "Accept-Encoding": "gzip,deflate,compress", // HACK: required for https://github.com/axios/axios/issues/5346 -- this line can be removed once this bug has been fixed
                    "X-Octopus-ApiKey": options.configuration.apiKey ?? "",
                },
                responseType: "json",
            };
            if (typeof XMLHttpRequest === "undefined") {
                if (config.headers) {
                    let userAgent = "ts-octopusdeploy";
                    if (options.configuration.userAgentApp) {
                        userAgent = `${userAgent} ${options.configuration.userAgentApp}`;
                    }
                    config.headers["User-Agent"] = userAgent;
                }
            }
            const response = await axios.request<TResource>(config);

            return {
                data: response.data,
                statusCode: response.status,
            };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new AdapterError(error.response.status, formatError(error.response) ?? error.message);
            } else {
                throw error;
            }
        }

        function formatError(response: any): string | undefined {
            if (!response.data) {
                return undefined;
            }

            let message = response.data.ErrorMessage;

            if (response.data.Errors) {
                const errors = response.data.Errors as string[];

                for (let i = 0; i < errors.length; i++) {
                    message += `\n${errors[i]}`;
                }
            }

            return message;
        }
    }
}
