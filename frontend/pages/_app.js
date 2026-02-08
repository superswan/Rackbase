import { AppProvider } from '../context/AppContext';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <style>{`
          /* Reset and base styles */
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          * {
            box-sizing: border-box;
          }
          
          /* Global scrollbar styles */
          * {
            scrollbar-width: thin;
            scrollbar-color: #c1c1c1 #f1f1f1;
          }
          
          *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          *::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          *::-webkit-scrollbar-thumb {
            background-color: #c1c1c1;
            border-radius: 4px;
          }
          
          *::-webkit-scrollbar-thumb:hover {
            background-color: #a1a1a1;
          }
          
          /* Dark scrollbar for sidebar */
          aside * {
            scrollbar-color: #4a5568 transparent;
          }
          
          aside *::-webkit-scrollbar {
            width: 6px;
          }
          
          aside *::-webkit-scrollbar-track {
            background: transparent;
          }
          
          aside *::-webkit-scrollbar-thumb {
            background-color: #4a5568;
            border-radius: 3px;
          }
          
          aside *::-webkit-scrollbar-thumb:hover {
            background-color: #718096;
          }
          
          /* Hide scrollbar but keep functionality */
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          
          /* Better text selection */
          ::selection {
            background-color: #4299e1;
            color: white;
          }
          
          /* Smooth focus states */
          *:focus {
            outline: none;
          }
          
          *:focus-visible {
            outline: 2px solid #4299e1;
            outline-offset: 2px;
          }
        `}</style>
      </Head>
      <AppProvider>
        <Component {...pageProps} />
      </AppProvider>
    </>
  );
}
