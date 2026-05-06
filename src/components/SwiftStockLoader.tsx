import React from "react";

const styles = `
  .ss-loader-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .ss-svg-loader {
    width: 120px;
    height: 120px;
  }

  .ss-path-yellow {
    stroke: #fdb913;
    stroke-width: 18;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1200;
    animation: ssLoopY 5s ease-in-out infinite;
  }

  .ss-path-orange {
    stroke: #f37023;
    stroke-width: 18;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1200;
    animation: ssLoopO 5s ease-in-out infinite;
  }

  @keyframes ssLoopY {
    0%   { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 1; }
    30%  { stroke-dashoffset: 0;    fill: transparent; fill-opacity: 0; stroke-opacity: 1; }
    55%  { stroke-dashoffset: 0;    fill: #fdb913;     fill-opacity: 1; stroke-opacity: 0; }
    70%  { stroke-dashoffset: 0;    fill: #fdb913;     fill-opacity: 1; stroke-opacity: 0; }
    90%  { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 0; }
    100% { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 0; }
  }

  @keyframes ssLoopO {
    0%   { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 0; }
    10%  { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 1; }
    45%  { stroke-dashoffset: 0;    fill: transparent; fill-opacity: 0; stroke-opacity: 1; }
    68%  { stroke-dashoffset: 0;    fill: #f37023;     fill-opacity: 1; stroke-opacity: 0; }
    78%  { stroke-dashoffset: 0;    fill: #f37023;     fill-opacity: 1; stroke-opacity: 0; }
    95%  { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 0; }
    100% { stroke-dashoffset: 1200; fill: transparent; fill-opacity: 0; stroke-opacity: 0; }
  }
`;

export default function SwiftStockLoader() {
  return (
    <>
      <style>{styles}</style>
      <div className="ss-loader-wrap">
        <svg
          className="ss-svg-loader"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="ss-path-yellow"
            d="M341.72,313.42c15.21-15.7,14.33-41.81-2.64-56.3-14.78-12.63-36.72-10.74-50.29,3.27l-14.23,14.68h0l-14.99,15.47c-17.19,17.74-39.76,26.61-62.34,26.61s-45.15-8.87-62.33-26.6c-34.37-35.48-34.37-93.2,0-128.67l14.99-15.48c27.11-27.98,7.91-75.82-30.43-75.82h0c-23.77,0-43.03,19.89-43.03,44.42v282.74c0,24.53,19.27,44.42,43.03,44.42h79.71c11.41,0,22.36-4.68,30.43-13.01l112.1-115.71.02-.02Z"
          />
          <path
            className="ss-path-orange"
            d="M313.7,70.56c-11.41,0-22.36,4.68-30.43,13.01l-112.1,115.71c-14.38,14.84-14.38,38.99,0,53.84,14.38,14.84,37.78,14.84,52.16,0l14.99-15.47h0l13.67-14.11c33.92-35.01,89.17-37.24,124.07-3.28,36.27,35.28,36.91,94.47,1.91,130.59l-14.99,15.47c-27.11,27.98-7.91,75.82,30.43,75.82h0c23.77,0,43.03-19.89,43.03-44.42V114.98c0-24.53-19.27-44.42-43.03-44.42h-79.71Z"
          />
        </svg>
      </div>
    </>
  );
}
