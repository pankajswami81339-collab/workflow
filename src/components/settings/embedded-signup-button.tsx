'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type EmbeddedSignupResult = {
  code: string;
  phone_number_id?: string;
  waba_id?: string;
  access_token?: string;
};

interface Props {
  onSuccess: (result: EmbeddedSignupResult) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;

      login: (
        callback: (response: {
          authResponse?: {
            code?: string;
            accessToken?: string;
          };
          status?: string;
        }) => void,
        options: {
          config_id: string;
          response_type: 'code';
          override_default_response_type: boolean;
          extras: {
            setup: Record<string, unknown>;
            featureType?: string;
            sessionInfoVersion?: string;
          };
        },
      ) => void;
    };

    fbAsyncInit?: () => void;
  }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? '';
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID ?? '';

export function EmbeddedSignupButton({
  onSuccess,
  onError,
  disabled = false,
}: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);

  /*
   * ---------------------------------------------------------
   * 1. Load + initialize Facebook SDK
   * ---------------------------------------------------------
   */
  useEffect(() => {
    if (!APP_ID) {
      console.error('NEXT_PUBLIC_META_APP_ID is missing');
      return;
    }

    if (!CONFIG_ID) {
      console.error('NEXT_PUBLIC_META_CONFIG_ID is missing');
      return;
    }

    // SDK already loaded and initialized
    if (window.FB) {
      setSdkReady(true);
      return;
    }

    const previousInit = window.fbAsyncInit;

    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId: APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v23.0',
        });

        setSdkReady(true);
      } catch (error) {
        console.error('Facebook SDK initialization failed:', error);
        onError?.('Facebook SDK initialization failed.');
      }

      // Preserve any previous callback if another component uses it.
      if (previousInit) {
        try {
          previousInit();
        } catch {
          // Ignore previous callback errors.
        }
      }
    };

    const existingScript = document.getElementById(
      'facebook-jssdk',
    ) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');

      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      document.body.appendChild(script);
    }

    return () => {
      // Do NOT remove the Facebook SDK.
    };
  }, [onError]);

  /*
   * ---------------------------------------------------------
   * 2. Receive WhatsApp Embedded Signup session information
   * ---------------------------------------------------------
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Meta sends the Embedded Signup event from Facebook.
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      let data: any;

      try {
        data =
          typeof event.data === 'string'
            ? JSON.parse(event.data)
            : event.data;
      } catch {
        return;
      }

      if (data?.type !== 'WA_EMBEDDED_SIGNUP') {
        return;
      }

      console.log('WhatsApp Embedded Signup event:', data);

      /*
       * Normal Cloud API Embedded Signup
       */
      if (data.event === 'FINISH') {
        const phone_number_id = data.data?.phone_number_id;
        const waba_id = data.data?.waba_id;

        setLoading(false);

        /*
         * IMPORTANT:
         *
         * The authorization CODE comes from FB.login callback.
         * We don't try to get it from FB.getLoginStatus().
         *
         * phone_number_id + waba_id are session information.
         */
        window.dispatchEvent(
          new CustomEvent('WA_EMBEDDED_SIGNUP_FINISH', {
            detail: {
              phone_number_id,
              waba_id,
            },
          }),
        );

        return;
      }

      /*
       * WhatsApp Business App / Coexistence flow
       */
      if (
        data.event ===
        'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
      ) {
        const phone_number_id = data.data?.phone_number_id;
        const waba_id = data.data?.waba_id;

        setLoading(false);

        window.dispatchEvent(
          new CustomEvent('WA_EMBEDDED_SIGNUP_FINISH', {
            detail: {
              phone_number_id,
              waba_id,
            },
          }),
        );

        return;
      }

      if (data.event === 'CANCEL') {
        setLoading(false);
        onError?.('Facebook signup was cancelled.');
        return;
      }

      if (data.event === 'ERROR') {
        setLoading(false);

        onError?.(
          data.data?.error_message ??
            'An error occurred during Facebook signup.',
        );

        return;
      }
    },
    [onError],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  /*
   * ---------------------------------------------------------
   * 3. Launch Embedded Signup
   * ---------------------------------------------------------
   */
  const handleClick = useCallback(() => {
    if (!APP_ID) {
      onError?.(
        'META_APP_ID is missing. Check your .env.local file.',
      );
      return;
    }

    if (!CONFIG_ID) {
      onError?.(
        'META_CONFIG_ID is missing. Check your .env.local file.',
      );
      return;
    }

    if (!window.FB || !sdkReady) {
      onError?.(
        'Facebook SDK is still loading. Please wait a moment and try again.',
      );
      return;
    }

    setLoading(true);

    /*
     * IMPORTANT:
     * FB.login must happen directly from the button click.
     */
    window.FB.login(
      (response) => {
        console.log('Facebook login response:', response);

        if (response?.authResponse?.code) {
          /*
           * This CODE must be sent to your backend.
           *
           * DO NOT exchange it in the browser because
           * App Secret must remain server-side.
           */
          const code = response.authResponse.code;

          /*
           * Wait for WA_EMBEDDED_SIGNUP event to get
           * phone_number_id / waba_id.
           */
          const finishHandler = (event: Event) => {
            const customEvent =
              event as CustomEvent<{
                phone_number_id?: string;
                waba_id?: string;
              }>;

            window.removeEventListener(
              'WA_EMBEDDED_SIGNUP_FINISH',
              finishHandler,
            );

            setLoading(false);

            onSuccess({
              code,
              phone_number_id:
                customEvent.detail?.phone_number_id,
              waba_id: customEvent.detail?.waba_id,
            });
          };

          window.addEventListener(
            'WA_EMBEDDED_SIGNUP_FINISH',
            finishHandler,
          );

          return;
        }

        /*
         * User cancelled or Meta didn't return a code.
         */
        setLoading(false);

        if (response?.status === 'unknown') {
          onError?.(
            'Facebook login was cancelled or the popup was blocked.',
          );
        } else {
          onError?.(
            'Facebook did not return an authorization code.',
          );
        }
      },
      {
        config_id: CONFIG_ID,

        /*
         * Embedded Signup should return an authorization code.
         */
        response_type: 'code',

        override_default_response_type: true,

        extras: {
          setup: {},

          /*
           * Keep this ONLY if you want users to connect
           * an existing WhatsApp Business App number
           * through the coexistence flow.
           */
          featureType: 'whatsapp_business_app_onboarding',

          sessionInfoVersion: '3',
        },
      },
    );
  }, [sdkReady, onError, onSuccess]);

  const notConfigured = !APP_ID || !CONFIG_ID;

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={
        disabled ||
        loading ||
        !sdkReady ||
        notConfigured
      }
      className="h-11 w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1665d8] text-white font-semibold shadow-md transition-all"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="white"
        >
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.03 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.27h3.328l-.532 3.49h-2.796v8.437C19.612 23.095 24 18.103 24 12.073z" />
        </svg>
      )}

      <span>
        {notConfigured
          ? 'Configure Meta App first'
          : loading
            ? 'Opening Facebook…'
            : 'Connect with Facebook'}
      </span>
    </Button>
  );
}