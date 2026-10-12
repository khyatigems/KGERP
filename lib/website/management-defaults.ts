import {collectionSchema,bannerSchema,announcementSchema,checkoutSchema,offerSchema,type WebsiteSection} from './contracts';
export function websiteManagementDefaults(section:Exclude<WebsiteSection,'products'>):Record<string,unknown>{
 switch(section){
  case 'collections':return {...collectionSchema.parse({title:'New collection',slug:'new-collection',description:'',productIds:[]}),title:'',slug:''};
  case 'offers':return {...offerSchema.parse({title:'New offer',percent:0,productIds:['placeholder'],startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+604800000).toISOString(),enabled:false}),title:'',productIds:[]};
  case 'banners':return bannerSchema.parse({title:'',text:'',enabled:false});
  case 'announcements':return announcementSchema.parse({title:'',text:'',enabled:false});
  case 'checkout':return checkoutSchema.parse({countries:['IN'],currency:'INR',guestCheckout:true,prepaidOnly:true,checkoutEnabled:false,shippingIncludedInPrice:false,taxIncludedInPrice:false,supportEmail:'support@khyatigems.com',shippingPolicy:'/delivery.html',returnsPolicy:'/policies.html#returns',terms:'/policies.html#terms',dispatchMessage:''});
 }
}
