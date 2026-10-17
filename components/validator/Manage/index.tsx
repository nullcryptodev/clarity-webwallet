import { hexToBigInt, Validator } from "@claritychain/rpc";
import { FC } from "react";
import PageHeading from "../../PageHeading";
import Summary from "./Summary";
import UpdateRewardAddress from "./UpdateRewardAddress";
import Unregister from "./Unregister";
import RotateKey from "./RotateKey";

type props = {
  validator: Validator;
}

const ManageValidator: FC <props> = ({ validator }) => {
  const id = hexToBigInt(validator.id);
  const stake = hexToBigInt(validator.stake);

  return (
    <div>
      <PageHeading
        go_back_url="/wallet"
        title={`Validator #${id.toString()}`}
        subtitle={`Registered at block #${hexToBigInt(validator.registered_at_height).toString()}.`}
      />

      <Summary validator={validator} />

      <div className="mt-6 space-y-6">
        <UpdateRewardAddress validator={validator} />
        <RotateKey validator={validator} />
        <Unregister validator={validator} />
      </div>
    </div>
  );
}

export default ManageValidator;