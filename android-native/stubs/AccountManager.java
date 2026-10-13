package android.accounts;
import android.content.Intent;
import android.os.Bundle;
import java.util.ArrayList;
import java.util.List;
public class AccountManager {
    public static final String KEY_ACCOUNT_NAME = "authAccount";
    public static final String KEY_ACCOUNT_TYPE = "accountType";
    public static Intent newChooseAccountIntent(
        Account selectedAccount,
        List<Account> allowableAccounts,
        String[] allowableAccountTypes,
        String descriptionOverrideText,
        String addAccountAuthTokenType,
        String[] addAccountRequiredFeatures,
        Bundle addAccountOptions
    ) { return null; }
    public static Intent newChooseAccountIntent(
        Account selectedAccount,
        ArrayList<Account> allowableAccounts,
        String[] allowableAccountTypes,
        boolean alwaysPromptForAccount,
        String descriptionOverrideText,
        String addAccountAuthTokenType,
        String[] addAccountRequiredFeatures,
        Bundle addAccountOptions
    ) { return null; }
}
