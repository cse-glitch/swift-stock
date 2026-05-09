import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const styles = `
  .order-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn .3s ease;
    padding: 20px;
  }

  .order-modal {
    width: 100%;
    max-width: 360px;
    background: #fff;
    border-radius: 32px;
    padding: 38px 28px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    overflow: hidden;
    position: relative;
  }

  .loader-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 26px;
  }

  .loader-ring {
    position: absolute;
    width: 170px;
    height: 170px;
    border-radius: 999px;
    border: 4px dashed rgba(253,185,19,0.25);
    animation: spin 7s linear infinite;
  }

  .svg-loader {
    width: 110px;
    height: 110px;
    z-index: 2;
  }

  .path-yellow {
    stroke: #fdb913;
    stroke-width: 18;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1200;
    animation: loopY 3s ease-in-out infinite;
  }

  .path-orange {
    stroke: #f37023;
    stroke-width: 18;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1200;
    animation: loopO 3s ease-in-out infinite;
  }

  .title {
    font-size: 28px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 10px;
  }

  .subtitle {
    font-size: 15px;
    line-height: 1.7;
    color: #6b7280;
    margin-bottom: 28px;
  }

  .steps {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
  }

  .step {
    flex: 1;
    background: #f9fafb;
    border-radius: 18px;
    padding: 14px 10px;
    font-size: 13px;
    color: #6b7280;
    transition: .3s ease;
  }

  .step.active {
    background: rgba(243,112,35,0.08);
    color: #f37023;
    font-weight: 600;
    transform: translateY(-2px);
  }

  .success-wrap {
    animation: pop .5s ease;
  }

  .success-circle {
    width: 120px;
    height: 120px;
    margin: 0 auto 22px;
    border-radius: 999px;
    background: rgba(34,197,94,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1.5s infinite;
  }

  .success-check {
    width: 48px;
    height: 48px;
  }

  .success-btn {
    width: 100%;
    border: none;
    background: rgba(34,197,94,0.12);
    color: #16a34a;
    font-size: 18px;
    font-weight: 700;
    padding: 18px;
    border-radius: 18px;
    margin-top: 26px;
    cursor: pointer;
    transition: .3s ease;
  }

  .success-btn:hover {
    transform: translateY(-2px);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(.85);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes loopY {
    0% {
      stroke-dashoffset: 1200;
      fill: transparent;
      fill-opacity: 0;
      stroke-opacity: 1;
    }

    40% {
      stroke-dashoffset: 0;
      fill: transparent;
      fill-opacity: 0;
      stroke-opacity: 1;
    }

    70% {
      fill: #fdb913;
      fill-opacity: 1;
      stroke-opacity: 0;
    }

    100% {
      fill: #fdb913;
      fill-opacity: 1;
      stroke-opacity: 0;
    }
  }

  @keyframes loopO {
    0% {
      stroke-dashoffset: 1200;
      fill: transparent;
      fill-opacity: 0;
      stroke-opacity: 0;
    }

    15% {
      stroke-opacity: 1;
    }

    55% {
      stroke-dashoffset: 0;
      fill: transparent;
      fill-opacity: 0;
      stroke-opacity: 1;
    }

    80% {
      fill: #f37023;
      fill-opacity: 1;
      stroke-opacity: 0;
    }

    100% {
      fill: #f37023;
      fill-opacity: 1;
      stroke-opacity: 0;
    }
  }
`;

interface OrderConfirmationLoaderProps {
  onClose: () => void;
}

export default function OrderConfirmationLoader({ onClose }: OrderConfirmationLoaderProps) {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuccess(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  const content = (
    <>
      <style>{styles}</style>

      <div className="order-overlay">
        <div className="order-modal">

          {!success ? (
            <>
              <div className="loader-wrap">

                <div className="loader-ring"></div>

                <svg
                  className="svg-loader"
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className="path-yellow"
                    d="M341.72,313.42c15.21-15.7,14.33-41.81-2.64-56.3-14.78-12.63-36.72-10.74-50.29,3.27l-14.23,14.68h0l-14.99,15.47c-17.19,17.74-39.76,26.61-62.34,26.61s-45.15-8.87-62.33-26.6c-34.37-35.48-34.37-93.2,0-128.67l14.99-15.48c27.11-27.98,7.91-75.82-30.43-75.82h0c-23.77,0-43.03,19.89-43.03,44.42v282.74c0,24.53,19.27,44.42,43.03,44.42h79.71c11.41,0,22.36-4.68,30.43-13.01l112.1-115.71.02-.02Z"
                  />

                  <path
                    className="path-orange"
                    d="M313.7,70.56c-11.41,0-22.36,4.68-30.43,13.01l-112.1,115.71c-14.38,14.84-14.38,38.99,0,53.84,14.38,14.84,37.78,14.84,52.16,0l14.99-15.47h0l13.67-14.11c33.92-35.01,89.17-37.24,124.07-3.28,36.27,35.28,36.91,94.47,1.91,130.59l-14.99,15.47c-27.11,27.98-7.91,75.82,30.43,75.82h0c23.77,0,43.03-19.89,43.03-44.42V114.98c0-24.53-19.27-44.42-43.03-44.42h-79.71Z"
                  />
                </svg>
              </div>

              <div className="title">
                Confirming Your Order
              </div>

              <div className="subtitle">
                Please wait while we securely process your order and prepare it for delivery.
              </div>

              <div className="steps">
                <div className="step">
                  Secure
                </div>

                <div className="step active">
                  Processing
                </div>

                <div className="step">
                  Preparing
                </div>
              </div>
            </>
          ) : (
            <div className="success-wrap">

              <div className="success-circle">
                <svg
                  className="success-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <div className="title">
                Order Confirmed!
              </div>

              <div className="subtitle">
                Your order has been placed successfully and will be processed shortly.
              </div>

              <button className="success-btn" onClick={onClose}>
                Thank You ❤
              </button>

            </div>
          )}

        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
