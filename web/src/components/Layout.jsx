// web/src/components/Layout.jsx
import React from "react";
import TopBar from "./TopBar";

export default function Layout({ children }) {
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}
