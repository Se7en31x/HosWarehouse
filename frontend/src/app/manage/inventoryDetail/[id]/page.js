import React from 'react';

export default async function InventoryDetailPage(props) {
    const params = await props.params; // ✅ แก้ตรงนี้
    const { id } = params;
  
    return (
      <div>
        <h1>Inventory Detail Page</h1>
        <p>Item ID: {id}</p>
      </div>
    );
  }
  
  
  
