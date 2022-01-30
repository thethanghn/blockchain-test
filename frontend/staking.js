Moralis.start({
  serverUrl: "https://jms66zb8h4zr.moralishost.com:2053/server",
  appId: "QMLoVdfDAzpL4S4xoRyEtuhKjpO7fsJJLosljwm5",
});
// Moralis.start({
//   serverUrl: "https://dcquhnfijzoj.usemoralis.com:2053/server",
//   appId: "azFF9z7o5hDxDQDndiRRpQByi93r9bThXq3eiPIb",
// }); // test net
let user;
let balances = {};
let web3;
let stakingContract = null;
let caashContract = null;
let cashBalance = '0';
let stakingValue = null;
let stakingTerm = 24 * 60 * 60 * 365; // 12 months
let selectedStakeId = 0;

const BSCSCAN_TX_URL = "https://bscscan.com/tx/";
const DECIMALS = 5;
const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const WBNB_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const CASH_ADDRESS = "0x18950820a9108a47295b40b278f243dfc5d327b5";
const COW_ADDRESS = '0xcdd1d715f01bf959bf94cd553f43250ddb303d1f';
const CASH_TESTNET_ADDRESS = "0xc1710DA42Bb65cEB0194a0Fd08b3c96d0126585A";
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
const STAKING_CONTRACT_ADDRESS = "0xc8Ea62Cee1ea791fA3447B7efcA5273C8B1A2873";
const MAINNET_ID = 56; // 56 for mainnet
const GAS_PRICE = 5.8; // Gwei
const CONTRACT_CREATION_BLOCK_ID = 12187017;
const networks = {
  1: "eth",
  4: "rinkeby",
  56: "bsc",
  97: "bsc testnet",
  137: "matic",
  80001: "mumbai",
};

const _1e16 = new BN("10000000000000000", 10);

// currently, Moralis plugin doesn't support protocols parameter so we will call 1inch API directly with protocol PANCAKESWAP_V2. Because without protocols parameter, the 1inch API return wrong price when the amount is <= 1 usdt due to the fee is often > 1usdt. And the important thing is the price from 1Inch without protocols parameter is average price from many dexes so and we want it to be the same with pancakeswap.

setInterval(function () {
  loadCashPrice();
}, 10000);

setInterval(function () {
  loadCowPrice();
}, 10000);

async function init() {
  await Moralis.initPlugins();
  await renderInterface();

  const infoOptions = {
    delay: 20000,
  };
  $(".info-toast-container .toast").toast(infoOptions);

  await loadCashPrice();
  await loadCowPrice();
}

async function initContracts() {
  try {
    if (!web3) {
      console.log("WEB3 is not initialized");
      return;
    }

    const caashContractInfo = await Moralis.Cloud.run("getAbi", {
      name: "caash",
    });

    caashContract = new web3.eth.Contract(
      JSON.parse(caashContractInfo.abi),
      caashContractInfo.address
    );

    const stakingContractInfo = await Moralis.Cloud.run("getAbi", {
      name: "staking",
    });

    stakingContract = new web3.eth.Contract(
      JSON.parse(stakingContractInfo.abi),
      stakingContractInfo.address
    );
  } catch (error) {
    console.log("initContracts exception");
    console.log(error);
  }
}

$(".info-toast-container .toast").on("hidden.bs.toast", function () {
  $(".info-toast-container").css("z-index", "-1");
});

async function loadCashPrice() {
  const options = {
    address: CASH_ADDRESS,
    chain: "bsc",
    exchange: "PancakeSwapv2",
  };
  const cashPrice = await Moralis.Web3API.token.getTokenPrice(options);
  $("#cash_price").text(Number(cashPrice.usdPrice.toFixed(DECIMALS)));
}

async function loadCowPrice() {
  const options = {
    address: COW_ADDRESS,
    chain: "bsc",
    exchange: "PancakeSwapv2"
  };
  const cowPrice = await Moralis.Web3API.token.getTokenPrice(options);
  $('#cow_price').text(Number(cowPrice.usdPrice.toFixed(DECIMALS)));
}

async function renderInterface() {
  user = Moralis.User.current();
  if (user) {
    document.getElementById("connect_wallet_button").hidden = true;
    document.getElementById("logout_button").hidden = false;

    $("#address").text(shortenAddress(user.get("ethAddress")));
    $("#address").show(user.get("ethAddress"));
    await enabledMoralisWeb3(window.localStorage.getItem('provider', null));
    const networkId = await web3.eth.net.getId();
    if (networkId != MAINNET_ID) {
      $(".info-toast-container .info-title").html("Error");
      $(".info-toast-container .info-body").html(
        "Please switch to Binance Smart Chain Wallet"
      );
      $(".info-toast-container").css("z-index", "1");
      $(".info-toast-container .toast").toast("show");
      logOut();
    }
    await initContracts();
  } else {
    document.getElementById("connect_wallet_button").hidden = false;
    document.getElementById("logout_button").hidden = true;
    $("#address").text("");
    $("#address").hide();
  }
  await renderStakingState();
}

async function renderStakingState() {
  renderPool();

  renderActiveStaking();

  renderHistoryStaking();
  let cashBalanceStr = '0';
  if (user) {
    const address = user.get("ethAddress");
    cashBalanceStr = await caashContract.methods["balanceOf"](address).call();
  }
  stakingValue = cashBalance = new BN(cashBalanceStr, 10);

  renderCurrentStaking();
}

async function renderPool() {
  try {
    const totalStakedResponse = await Moralis.Cloud.run("getTotalStaked");
    const totalStakedBN = new BN(totalStakedResponse.totalStaked, 10);
    $("#total_staked").text(thousandSeparator(formatBigNumber(totalStakedBN)));
    if (!user) {
      $("#your_staked").text('0.00');
      $("#your_earned").text('0.00');
      return;
    }
    const address = user.get("ethAddress");
    const yourStakingIds = await stakingContract.methods[
      "getStakingIds"
    ]().call({
      from: address,
    });
    let yourStaked = new BN("0", 10);
    let yourEarned = new BN("0", 10);
    for (let i = 0; i < yourStakingIds.length; ++i) {
      const balance = await stakingContract.methods["idToBalance"](
        yourStakingIds[i].toString()
      ).call();
      yourStaked = yourStaked.add(new BN(balance, 10));
      const interest = await stakingContract.methods["getInterest"](
        yourStakingIds[i].toString()
      ).call({ from: address });
      yourEarned = yourEarned.add(new BN(interest, 10));
    }

    $("#your_staked").text(thousandSeparator(formatBigNumber(yourStaked)));

    $("#your_earned").text(thousandSeparator(formatBigNumber(yourEarned)));
  } catch (error) {
    console.log("renderPool exception");
    console.log(error);
  }
}

async function renderActiveStaking() {
  try {
    if (!user) {
      $("#active_stakes tbody").html(
        `<tr><td colspan="4" class="text-center">No staking found!</td></tr>`
      );
      return;
    }

    const active = await getActiveStaking(stakingContract);

    let rows = active.map(
      (item) =>
        `<tr>
        <td>${formatBigNumber(new BN(item.principal, 10))}</td>
        <td>${moment(Number(item.from) * 1000).format("DD/MM/YYYY hh:mm:ss")}</td>
        <td>${moment((Number(item.from) + Number(item.term)) * 1000).format(
          "DD/MM/YYYY hh:mm:ss"
        )}</td>
        <td><button type="button" class="btn btn-outline-primary btn-withdraw" data-id="${item.id
        }" data-from="${item.from}" data-term="${item.term}" data-principal="${item.principal}">Withdraw</button></td>
      </tr>`
    );

    if (rows.length === 0) {
      $("#active_stakes tbody").html(
        `<tr><td colspan="4" class="text-center">No staking found!</td></tr>`
      );
    } else {
      $("#active_stakes tbody").html(rows.join(""));
    }
  } catch (error) {
    console.log("renderActiveStaking exception");
    console.log(error);
  }
}

async function renderHistoryStaking() {
  try {
    if (!user) {
      $("#history_stakes tbody").html(
        `<tr><td colspan="4" class="text-center">No staking found!</td></tr>`
      );
      return;
    }

    const history = await getHistoryStaking(stakingContract);
    let rows = history.map(
      (item) =>
        `<tr>
        <td>${formatBigNumber(new BN(item.principal, 10))}</td>
        <td>${moment(Number(item.from) * 1000).format("DD/MM/YYYY hh:mm:ss")}</td>
        <td>${moment(Number(item.to) * 1000).format("DD/MM/YYYY hh:mm:ss")}</td>
        <td>${formatBigNumber(new BN(item.interest, 10))}</td>
      </tr>`
    );

    if (rows.length === 0) {
      $("#history_stakes tbody").html(
        `<tr><td colspan="4" class="text-center">No staking found!</td></tr>`
      );
    } else {
      $("#history_stakes tbody").html(rows.join(""));
    }
  } catch (error) {
    console.log("renderHistoryStaking exception");
    console.log(error);
  }
}

async function renderCurrentStaking() {
  try {
    const interestRateResponse = await Moralis.Cloud.run("getInterestRate", { stakingTerm: stakingTerm });
    const interestRate = Number(interestRateResponse.interestRate);
    const apr =
      Number((interestRate * 365.0 * 24 * 60 * 60) / stakingTerm) / 10;
    $("#apr").text(apr.toFixed(2));

    if (!user) {
      $("#cash_balance").text('0.00');
      $("#earn").text('0.00');
      $("#from_amount").val('0.00');
      return;
    }
    
    $("#cash_balance").text(thousandSeparator(formatBigNumber(cashBalance)));
    $("#from_amount").val(formatBigNumber(stakingValue));
    const interestRateBN = new BN(interestRate, 10);
    const earn = formatBigNumber(
      stakingValue.mul(interestRateBN).div(new BN("1000", 10))
    );
    $("#earn").text(earn);
  } catch (error) {
    console.log("renderCurrentStaking exception");
    console.log(error);
  }
}

async function getActiveStaking(contract) {
  const user = Moralis.User.current();
  const address = user.get("ethAddress");
  const stakingIds = await contract.methods["getStakingIds"]().call({
    from: address,
  });
  const results = [];
  for (let i = 0; i < stakingIds.length; ++i) {
    const id = stakingIds[i].toString();
    const principal = await contract.methods["idToBalance"](id).call();
    const interest = await contract.methods["getInterest"](id).call({
      from: address,
    });
    const from = await contract.methods["idToStartTime"](id).call();
    const term = await contract.methods["idToTerm"](id).call();
    results.push({ id, principal, interest, from, term });
  }
  return results;
}

async function getHistoryStaking(contract) {
  const user = Moralis.User.current();
  const address = user.get("ethAddress");
  let fromBlock = CONTRACT_CREATION_BLOCK_ID;
  const latestBlock = await web3.eth.getBlockNumber();
  let history = [];
  while (fromBlock <= latestBlock) {
    const events = await contract.getPastEvents("Withdraw", {
      filter: { _from: address },
      fromBlock,
      toBlock: fromBlock + 4999,
    });
    const data = events.map((item) => ({
      from: item.returnValues?._startTimestamp,
      to: item.returnValues?._timestamp,
      principal: item.returnValues?._principal,
      interest: item.returnValues?._interest,
    }));
    history = history.concat(data);
    fromBlock += 5000;
  }

  return history;
}

async function onWithdraw(id) {
  try {
    if (!user) {
      console.log("onWithdraw: no user");
      return;
    }
    const address = user.get("ethAddress");
    await stakingContract.methods["withdraw"](id).send({ from: address });

    renderStakingState();
  } catch (error) { }
}

async function onMax() {
  stakingValue = cashBalance;
  renderCurrentStaking();
}

async function onStake() {
  try {
    $('#btn-stake').text('Starting...');
    $('#btn-stake').prop('disabled', true);
    if (!user || stakingValue <= 0) {
      let message = '';
      if (!user) {
        message = 'Please connect your BSC wallet to stake!';
      } else {
        message = 'The staking value must be greater than 0';
      }
      $('.info-toast-container .info-title').html('Error');
      $('.info-toast-container .info-body').html(message);
      $('.info-toast-container').css("z-index", "1");
      $('.info-toast-container .toast').toast('show');
    } else {
      const address = user.get("ethAddress");
      await caashContract.methods["approve"](
        stakingContract.options.address,
        stakingValue.toString()
      ).send({ from: address });

      $('#btn-stake').text('Staking...');

      await stakingContract.methods["stake"](stakingValue, stakingTerm).send({
        from: address,
      });
      renderStakingState();
      $('.info-toast-container .info-title').html('Success');
      $('.info-toast-container .info-body').html(`You've staked ${thousandSeparator(formatBigNumber(stakingValue))} CASH`);
      $('.info-toast-container').css("z-index", "1");
      $('.info-toast-container .toast').toast('show');
    }
  } catch (error) {
    console.log("onStake exception");
    console.log(error);
  }
  $('#btn-stake').text('Stake');
  $('#btn-stake').prop('disabled', false);
}

function shortenAddress(address) {
  return (
    address.substring(0, 6) +
    "..." +
    address.substring(address.length - 5, address.length)
  );
}

async function connectWallet(provider) {
  $("#wallets_modal").modal("hide");
  if (!user) {
    switch (provider) {
      case "metamask":
        user = await Moralis.authenticate();
        window.localStorage.setItem("provider", "metamask");
        break;
      case "trustwallet":
        user = await Moralis.authenticate();
        window.localStorage.setItem("provider", "trustwallet");
        break;
      case "walletconnect":
        user = await Moralis.authenticate({ provider: provider });
        window.localStorage.setItem("provider", "walletconnect");
        break;
      default:
        break;
    }
  }
  enabledMoralisWeb3(provider);
  await initContracts();
  await renderInterface();
}

async function enabledMoralisWeb3(provider = null) {
  switch (provider) {
    case "walletconnect":
      web3 = await Moralis.enableWeb3({
        provider: "walletconnect"
      });
      break;
    default:
      web3 = await Moralis.enableWeb3();
      break;
  }
}

async function logOut() {
  await Moralis.User.logOut();
  window.localStorage.removeItem("provider");
  await renderInterface();
}

function formatNumber(number) {
  if (!isNaN(number)) {
    number = number.toString();
  }
  const dotPosition = number.indexOf(".");
  if (dotPosition === -1) {
    number = number + ".00";
  } else if (dotPosition === number.length - 2) {
    number = number + "0";
  }

  return number;
}

function formatBigNumber(bigNumber) {
  return formatNumber(
    Number((bigNumber.div(_1e16).toString() / 100.0).toFixed(DECIMALS))
  );
}

function thousandSeparator(number) {
  if (typeof (number) === 'number') {
    number = number.toString();
  }

  if (typeof (number) == 'string') {
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return number;
}
// event handlers
document.getElementById("logout_button").onclick = logOut;

$(document).on("click", ".btn-withdraw", async function () {
  selectedStakeId = $(this).data("id");
  let stakingFrom = Number($(this).data('from'));
  let stakingTerm = Number($(this).data('term'));
  let stakingPrincipal = String($(this).data('principal'));
  const interest = await stakingContract.methods['getInterest'](selectedStakeId).call({
    from: user.get("ethAddress")
  });
  const interestBN = new BN(interest, 10);
  let message = '';
  if ((stakingFrom + stakingTerm) * 1000 > Number(moment().format('x'))) {
    const stakingReceived = (new BN(stakingPrincipal, 10)).mul(new BN('9', 10)).div(new BN('10', 10));
    message = `You will be penalized 10% principal for early withdrawal. You will get ${thousandSeparator(formatBigNumber(stakingReceived))} CASH.`;
  } else {
    const stakingReceived = (new BN(stakingPrincipal, 10)).add(interestBN);
    message = "You will get " + thousandSeparator(formatBigNumber(stakingReceived)) + ' CASH.';
  }
  $('#withdrawConfirmation .modal-body').text(message);
  $('#withdrawConfirmation').modal('show');
});

$(document).on("click", "#btn-withdraw-confirm", async function () {
  $(this).text('Withdrawing...');
  $(this).prop('disabled', true);
  await onWithdraw(selectedStakeId);
  $(this).text('Confirm');
  $(this).prop('disabled', false);
  $('#withdrawConfirmation').modal('hide');
});

$(".btn-period").click(function () {
  stakingTerm = $(this).data("value");

  renderCurrentStaking();
});

$("#btn-max").click(onMax);

$("#from_amount").change(function () {
  const amount = $(this).val() * (10 ** DECIMALS);
  stakingValue = new BN(amount, 10).mul(new BN("10000000000000", 10));
  if (stakingValue.gt(cashBalance)) {
    stakingValue = cashBalance;
    $('#from_amount').val(formatBigNumber(stakingValue));
  }
  renderCurrentStaking();
});

// $("#btn-stake").click(onStake);

$('#btn_roi').click(function () {
  $('#modal_roi').modal('show');
});

init();
