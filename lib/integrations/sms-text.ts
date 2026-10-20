export function orderSmsText(o:any,storeName="MART Store"):string|null{
  const n=o.orderNumber;
  switch(o.status){
    case "CONFIRMED":return storeName+": আপনার অর্ডার "+n+" নিশ্চিত হয়েছে। ধন্যবাদ!";
    case "SHIPPED":return storeName+": অর্ডার "+n+" পাঠানো হয়েছে"+(o.courierName?" ("+o.courierName+(o.trackingNumber?" "+o.trackingNumber:"")+")":"")+"।";
    case "DELIVERED":return storeName+": অর্ডার "+n+" ডেলিভারি হয়েছে। ধন্যবাদ!";
    case "CANCELLED":return storeName+": অর্ডার "+n+" বাতিল করা হয়েছে।";
    default:return null;
  }
}
