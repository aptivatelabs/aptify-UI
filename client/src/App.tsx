import { useEffect, useState } from "react";
import { Layout, Row, Col, Button, Spin } from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { Ed25519PrivateKey, Account, EntryFunctionArgumentTypes, SimpleEntryFunctionArgumentTypes, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import AssetDisplay from './AssetDisplay'; 
import { AssetData } from './interface/AssetData'; 
import { OdysseyResource } from './interface/OdysseyResource'; 
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";

function App() {
  const [odyssey, setOdyssey] = useState<OdysseyResource | null>(null);
  const [odysseyStatus, setOdysseyStatus] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [allocatedQty, setAllocatedQty] = useState(0);
  const [mintedQty, setMintedQty] = useState(0);
  const [loading, setLoading] = useState(false); // State for loading
  const { account, signAndSubmitTransaction } = useWallet();
  const [assetData, setAssetData] = useState<AssetData[]>([]);

  const aptos = getNetwork();

  const baseUrl = process.env.REACT_APP_API_BASE_URL; // Get base URL from environment variable

  if (!baseUrl) {
    throw new Error('REACT_APP_API_BASE_URL is not defined in .env file');
  }
  
  const fetchOdyssey = async () => {

    try {
      const response = await fetch(`${baseUrl}/api/get-odyssey`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setOdyssey(data.odyssey);
  
      setCoverImageIconTitle(data.odyssey.cover, data.odyssey.collection_name);
      displaySystemStatus(data.odyssey);
    } catch (e: any) {
      console.error("Error getting odyssey:", e.message);
    }
  };

  const setCoverImageIconTitle = async (coverUrl: string, collectionName: string) => {
    try {
      const response = await fetch(coverUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch cover image");
      }
      const data = await response.json();
      const imageUrl = data.image;
  
      changeFaviconAndTitle(imageUrl, collectionName);
  
      setCoverImage(imageUrl);
    } catch (error: any) {
      console.error("Error fetching cover image:", error.message);
    }
  };

  // Function to convert PNG image to Data URL
  const getPNGDataURL = async (imageUrl: string): Promise<string> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataURL = reader.result as string;
            resolve(dataURL);
        };
        reader.readAsDataURL(blob);
    });
  };

  const fetchAllocatedQty = async () => {
    try {
      if (odyssey?.merkle_root !== "0x"){
        const response = await fetch(`${baseUrl}/api/allocated-qty/${account?.address}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setAllocatedQty(data.allocatedQty);
      }
    } catch (error: any) {
      console.error('Error fetching allocated quantity:', error.message);
    }
  };

  const fetchMintedQty = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/minted-qty/${account?.address}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setMintedQty(data.mintedQty);
    } catch (error: any) {
      console.error('Error fetching minted quantity:', error.message);
    }
  };

  const fetchOwnedAsset = async () => {
    if (!account) return;
    
    try{
      const ownedDigitalAsset = await aptos.getOwnedDigitalAssets({
        ownerAddress: account.address,
      });

      // Filter ownedDigitalAsset by collection_name 
      const filteredAssets = ownedDigitalAsset.filter(item => item.current_token_data?.current_collection?.collection_name === odyssey?.collection_name);
   
      //console.log(odyssey?.collection_name + " : " + ownedDigitalAsset);
      // Map filteredAssets to the correct shape
      const transformedData: AssetData[] = filteredAssets.map(item => ({
        token_data_id: item.token_data_id,
        current_token_data: {
          token_name: item.current_token_data?.token_name ?? "Unknown Token Name",
          description: item.current_token_data?.description ?? "No Description Available",
          current_collection: {
            collection_name: item.current_token_data?.current_collection?.collection_name ?? "Unknown Collection",
            creator_address: item.current_token_data?.current_collection?.creator_address ?? "Unknown Creator",
            current_supply: item.current_token_data?.current_collection?.current_supply ?? 0,
          },
          token_uri: item.current_token_data?.token_uri ?? "#",
        }
      }));
    
      setAssetData(transformedData);
    }
    catch (error: any) {
      console.log("Error fetching assets: " + error);
    }
  };
  
  const displaySystemStatus = async (odyssey: OdysseyResource) => {


    if (!account || !odyssey) return;
    
    setOdysseyStatus("");
      
    try {
      if (odyssey.paused) {
        setOdysseyStatus("Minting paused.");
      } 
      
      if (odyssey.collection_size === odyssey.minted){
        setOdysseyStatus("Sold out.");
      }
      
      if (odyssey.merkle_root !== "0x" && presalesSalesStarted){
        if (allocatedQty === 0){
          setOdysseyStatus("You are not whitelisted."); 
        }else if (allocatedQty - mintedQty <= 0){
          setOdysseyStatus("Mint limit reached.");
        }
      } 
      
      // if (!publicSalesStarted && !presalesSalesStarted){
       
      //   if (odyssey.presale_end_time < Date.now() /1000){
      //     setOdysseyStatus("Public sales not started or ended.");
      //   }
      //   else {
      //     setOdysseyStatus("Presales sales not started or ended.");
      //   }        
      // }
      
      
    } catch (e: any) {
      console.error("Error getting odyssey status:", e.message);
    }
  };


  const updateTokenMetadataImage = async (index: string, token: string) => {
      try {
        const response = await fetch(
          `${baseUrl}/api/update-metadata-image/${index}/${token}`
        );

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Updated token metadata:', data);

      } catch (error: any) {
          console.error('Error updating token metadata:', error.message);
      }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOdyssey();
      fetchAllocatedQty();
      fetchMintedQty();
    }, 1000); // Polling every 1000ms (1 second)
  
    return () => clearInterval(interval); // Cleanup function to clear the interval

  }, [account?.address]);

  useEffect(() => {
      fetchOwnedAsset(); 
  }, [account?.address, odyssey]);



  const handleMint = async () => {
    if (!odyssey || loading) return; // Check if odyssey is null or if already loading, return
  
    try {
      setLoading(true); // Set loading to true when minting starts
      const response = await fetch(`${baseUrl}/api/get-mint-from-merkle-txn/${account?.address}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
        
      const data = await response.json();

      let proofs: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];

      const hexProof = data.simpleTxn.data.functionArguments[3];

      hexProof.forEach((p: any) => {
        proofs.push(p.data);
      });

      data.simpleTxn.data.functionArguments[3] = proofs;
      
      //Sign and submit transaction to chain
      const response2 = await signAndSubmitTransaction(data.simpleTxn);
      //Wait for transaction

      await aptos.waitForTransaction({ transactionHash: response2.hash });

      const events: any[] = response2.events;
      
      const mintEvent = events.find((event: any) => event.type === "0x4::collection::MintEvent" || event.type === "0x4::collection::Mint");
      
      let tokenIndex = "0";
      let tokenAddress = mintEvent.data.token;

      if (mintEvent.type === "0x4::collection::Mint"){
        tokenIndex = mintEvent.data.index.value;
      }
      else{
        tokenIndex = mintEvent.data.index;
      }
      console.log("tokenIndex: " + tokenIndex);
      console.log("tokenAddress: " + tokenAddress);
      await updateTokenMetadataImage(tokenIndex, tokenAddress);
      
      setLoading(false);
  
    } catch (error) {
      console.error('Minting error:', error);
      setLoading(false); // Set loading to false if there is an error
    }
  };

  const handleLoadTest1 = async () => {
    if (!odyssey || loading) return; // Check if odyssey is null or if already loading, return
  
    try {
      setLoading(true); // Set loading to true when minting starts
      for (let i = 0; i < 9400; i++) {
      const response = await fetch(`${baseUrl}/api/get-mint-from-merkle-txn/0x8ab13de75431fbf7473c81d3b1bda57b914bcfb2dcd6beb2362b18071c390c81`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
        
      const data = await response.json();

      let proofs: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];

      const hexProof = data.simpleTxn.data.functionArguments[3];

      hexProof.forEach((p: any) => {
        proofs.push(p.data);
      });

      data.simpleTxn.data.functionArguments[3] = proofs;

        const aptosConfig = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(aptosConfig);

        const account1: Account = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey("0x3c20017c85d8fddcd0447ec731d07487a1ed75592b03a4af932f5ad3caa6a055"),
          legacy: true, // or false, depending on your needs
        });

        // Assuming 'data' and 'aptos' are available
        data.simpleTxn.data.functionArguments[1] = i.toString();
        console.log("Account 1");
        
        const transaction = await aptos.transaction.build.simple({
          sender: account1.accountAddress,
          data: data.simpleTxn.data,
        });
        let committedTxn = await aptos.signAndSubmitTransaction({ signer: account1, transaction: transaction });
      }

      setLoading(false);
  
    } catch (error) {
      console.error('Minting error:', error);
      setLoading(false); // Set loading to false if there is an error
    }
  };

  const handleLoadTest2 = async () => {
    if (!odyssey || loading) return; // Check if odyssey is null or if already loading, return
  
    try {
      setLoading(true); // Set loading to true when minting starts
      for (let i = 0; i < 9400; i++) {
      const response = await fetch(`${baseUrl}/api/get-mint-from-merkle-txn/0x7896b88b788dbe9b03130782140ba4ae5fdb3888a36da3f2a86b1bd2395c1de7`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
        
      const data = await response.json();

      let proofs: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];

      const hexProof = data.simpleTxn.data.functionArguments[3];

      hexProof.forEach((p: any) => {
        proofs.push(p.data);
      });

      data.simpleTxn.data.functionArguments[3] = proofs;

        const aptosConfig = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(aptosConfig);

        const account1: Account = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey("0xf75f9e12a1c030d7aac9ef25d08064b3649a21a0d18742196560266b12cf8fcf"),
          legacy: true, // or false, depending on your needs
        });

        // Assuming 'data' and 'aptos' are available
        data.simpleTxn.data.functionArguments[1] = i.toString();
        console.log("Account 2");
        
        const transaction = await aptos.transaction.build.simple({
          sender: account1.accountAddress,
          data: data.simpleTxn.data,
        });
        let committedTxn = await aptos.signAndSubmitTransaction({ signer: account1, transaction: transaction });
      }
      setLoading(false);
  
    } catch (error) {
      console.error('Minting error:', error);
      setLoading(false); // Set loading to false if there is an error
    }
  };

  const handleLoadTest3 = async () => {
    if (!odyssey || loading) return; // Check if odyssey is null or if already loading, return
  
    try {
      setLoading(true); // Set loading to true when minting starts
      for (let i = 0; i < 9400; i++) {
      const response = await fetch(`${baseUrl}/api/get-mint-from-merkle-txn/0x5e8cd073c5bc733013a7f9aa12255ef384c35cd9f28fbd7f13380c291f719e25`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
        
      const data = await response.json();

      let proofs: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];

      const hexProof = data.simpleTxn.data.functionArguments[3];

      hexProof.forEach((p: any) => {
        proofs.push(p.data);
      });

      data.simpleTxn.data.functionArguments[3] = proofs;

        const aptosConfig = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(aptosConfig);

        const account1: Account = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey("0x3ff38111fe56d84280adb5021287c0b67ba627b32e3c9616936b88b8506c11c6"),
          legacy: true, // or false, depending on your needs
        });

        // Assuming 'data' and 'aptos' are available
        data.simpleTxn.data.functionArguments[1] = i.toString();
        console.log("Account 3");
        
        const transaction = await aptos.transaction.build.simple({
          sender: account1.accountAddress,
          data: data.simpleTxn.data,
        });
        let committedTxn = await aptos.signAndSubmitTransaction({ signer: account1, transaction: transaction });
      }
     
      setLoading(false);
  
    } catch (error) {
      console.error('Minting error:', error);
      setLoading(false); // Set loading to false if there is an error
    }
  };

  const handleLoadTest4 = async () => {
    if (!odyssey || loading) return; // Check if odyssey is null or if already loading, return
  
    try {
      setLoading(true); // Set loading to true when minting starts
      for (let i = 0; i < 9400; i++) {
      const response = await fetch(`${baseUrl}/api/get-mint-from-merkle-txn/0xf63323d74cbef60ff8587f705c22f429443461de85f77d5bdfa4cd4272f031b4`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
        
      const data = await response.json();

      let proofs: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes)[] = [];

      const hexProof = data.simpleTxn.data.functionArguments[3];

      hexProof.forEach((p: any) => {
        proofs.push(p.data);
      });

      data.simpleTxn.data.functionArguments[3] = proofs;

        const aptosConfig = new AptosConfig({ network: Network.TESTNET });
        const aptos = new Aptos(aptosConfig);

        const account1: Account = Account.fromPrivateKey({
          privateKey: new Ed25519PrivateKey("0xac9ca2273def8a77a34bea165807b9f860e6622482cfdd2215ccd1232f75526a"),
          legacy: true, // or false, depending on your needs
        });

        // Assuming 'data' and 'aptos' are available
        data.simpleTxn.data.functionArguments[1] = i.toString();
        console.log("Account 3");
        
        const transaction = await aptos.transaction.build.simple({
          sender: account1.accountAddress,
          data: data.simpleTxn.data,
        });
        let committedTxn = await aptos.signAndSubmitTransaction({ signer: account1, transaction: transaction });
      }
     
      setLoading(false);
  
    } catch (error) {
      console.error('Minting error:', error);
      setLoading(false); // Set loading to false if there is an error
    }
  };



  // Change Favicon and Title
  const changeFaviconAndTitle = async (imageUrl: string, newTitle: string) => {
    try {
        const dataURL = await getPNGDataURL(imageUrl);

        // Change Favicon
        const oldFavicon = document.querySelector('link[rel="icon"]');
        if (oldFavicon) {
            oldFavicon.setAttribute('href', dataURL);
        } else {
            const favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.href = dataURL;
            document.head.appendChild(favicon);
        }

        // Change Title
        document.title = newTitle;

    } catch (error) {
        console.error('Error changing favicon and title:', error);
    }
  };


  // Function to format Unix timestamp to local time
  const formatUnixTimestamp = (timestamp: number) => {

    const date = new Date(timestamp * 1000); // Convert to milliseconds

    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    
    const formattedDate = new Intl.DateTimeFormat("en-SG", options).format(date);
    return formattedDate;

  };

  function getNetwork() {
    let network="devnet";
    if (process.env.REACT_APP_APTOS_NETWORK !== undefined){
      network = process.env.REACT_APP_APTOS_NETWORK;
    }
    let selectedNetwork = Network.DEVNET;
    const lowercaseNetwork = network.toLowerCase();
    switch (lowercaseNetwork) {
      case "testnet":
        selectedNetwork = Network.TESTNET;
        break;
      case "mainnet":
        selectedNetwork = Network.MAINNET;
        break;
    case "random":
        selectedNetwork = Network.RANDOMNET;
        break;
    }
    const APTOS_NETWORK = selectedNetwork;
    const aptosConfig = new AptosConfig({ network: APTOS_NETWORK });
    const aptos = new Aptos(aptosConfig);
  
    return aptos;
  }

  const formatAPT = (apt: number) => {
    return apt / 100000000;
  };

  const publicSalesStarted = odyssey &&
  odyssey.public_sales_start_time > 0 &&
  odyssey.public_sales_end_time > 0 &&
  odyssey.public_sales_start_time <= Date.now() / 1000 &&
  Date.now() / 1000 <= odyssey.public_sales_end_time;


  const presalesSalesStarted = odyssey &&
  odyssey.presale_start_time > 0 &&
  odyssey.presale_end_time > 0 &&
  odyssey.presale_start_time <= Date.now() / 1000 &&
  Date.now() / 1000 <= odyssey.presale_end_time;

  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            {odyssey ? (
              <>
                <h1>{odyssey.odyssey_name}</h1>
              </>
            ) : (
              <p>Loading odyssey data...</p>
            )}
          </Col>
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector />
          </Col>
        </Row>
      </Layout>

      <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
        <Col span={6} offset={5}>
        {coverImage && (
          <img src={coverImage} alt="Odyssey Cover" style={{ maxWidth: "90%" }} />
        )}
        </Col>
        <Col span={9} offset={0}>
          {odyssey ? (
            <>
              <h2>{odyssey.collection_name}</h2>
              <p>{odyssey.description}</p>
              <p>Max Supply: {odyssey.collection_size} </p>
              <p>Total Minted: {odyssey.minted}</p>
              {odyssey.presale_start_time > 0 && (
                  <p>
                    Presales sales from: <b>{formatUnixTimestamp(odyssey.presale_start_time)}</b> to{" "}
                    <b>{formatUnixTimestamp(odyssey.presale_end_time)}</b> <br /><br />
                    Presales sales: <b>{formatAPT(odyssey.presale_mint_fee)} APT</b>
                  </p>
                  
                )}
              <p>
                Public sales from: <b>{formatUnixTimestamp(odyssey.public_sales_start_time)}</b> to <b>{formatUnixTimestamp(odyssey.public_sales_end_time)}</b> <br /><br />
                Public sales: <b>{formatAPT(odyssey.public_sales_mint_fee)} APT</b>
              </p>
             
               {odyssey.merkle_root !== "0x" && odyssey.presale_end_time >= Date.now()/1000 && (
                <>
                  <p><b>Allocated:</b> {allocatedQty}<br />
                  <b>Minted:</b> {mintedQty}<br />
                  <b>Left: </b>{allocatedQty - mintedQty}</p>
                </>
              )}
            
              {odyssey.merkle_root === "0x" && <p></p>}
              {
                
                odyssey.collection_size === odyssey.minted || 
                (odyssey.merkle_root !== "0x" && allocatedQty - mintedQty <= 0 && !publicSalesStarted) ||
                odyssey.paused === true ||
                (!presalesSalesStarted && !publicSalesStarted) ? (

                <Button onClick={handleMint} style={{ marginTop: "10px" }} disabled={true}>
                  {loading ? <Spin /> : "Mint"}
                </Button>
              ) : (
                <Button onClick={handleMint} style={{ marginTop: "10px" }} disabled={loading}>
                  {loading ? <Spin /> : "Mint"}
                </Button>
              )}
              <br />
              
            </>
          ) : (
            <p></p>
          )}
          <Button onClick={handleLoadTest1} style={{ marginTop: "10px" }}>
                 Wallet 1
                </Button><br />
                <Button onClick={handleLoadTest2} style={{ marginTop: "10px" }}>
                 Wallet 2
                </Button><br />
                <Button onClick={handleLoadTest3} style={{ marginTop: "10px" }}>
                 Wallet 3
                </Button><br />
                <Button onClick={handleLoadTest4} style={{ marginTop: "10px" }}>
                 Wallet 4
                </Button>
          <p className="odysseyStatus">{odysseyStatus}</p>
        </Col>
      </Row>
      <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
        
        <Col span={15} offset={5}>
          {odyssey ? (
            <>
              <h2>Your digital assets: </h2>
              <AssetDisplay data={assetData} />
              
            </>
          ) : (
            <p></p>
          )}
          
        </Col>
      </Row>
    </>
  );
}

export default App;
